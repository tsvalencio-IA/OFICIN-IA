/**
 * JARVIS ERP — ia.js
 * Gemini AI Integration with Advanced Auditory & History (24 months)
 *
 * Powered by thIAguinho Soluções Digitais
 */
'use strict';

window.iaHistorico = [];

function _iaNorm(txt) {
  return String(txt || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function _iaNum(v) {
  if (typeof v === 'number' && isFinite(v)) return v;
  const s = String(v == null ? '' : v).replace(/\s/g, '').replace(/R\$/gi, '');
  if (!s) return 0;
  return parseFloat(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s) || 0;
}

function _iaMoeda(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(_iaNum(v));
}

function _iaHojeLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function _iaStatusAberto(status) {
  const s = _iaNorm(status);
  return !['pago', 'liquidado', 'baixado', 'cancelado', 'cancelada'].includes(s);
}

function _iaLinhaFin(f) {
  const venc = f.venc || f.vencimento || f.dataVencimento || '-';
  return `- ${venc}: ${f.desc || f.descricao || 'Lancamento'} | ${_iaMoeda(f.valor)} | ${f.status || 'Aberto'}`;
}

window.thiaResponderLocal = function (pergunta) {
  const q = _iaNorm(pergunta);
  const J = window.J || {};
  const fin = Array.isArray(J.financeiro) ? J.financeiro : [];
  const os = Array.isArray(J.os) ? J.os : [];
  const estoque = Array.isArray(J.estoque) ? J.estoque : [];
  const hoje = _iaHojeLocal();

  if (/\b(boleto|conta|titulo|duplicata).*(vence|vencem|vencendo).*hoje|\b(vence|vencem).*hoje.*(boleto|conta|titulo|duplicata)/.test(q)) {
    const itens = fin.filter(f => {
      const tipo = _iaNorm([f.tipo, f.categoria, f.origem, f.desc].join(' '));
      const venc = String(f.venc || f.vencimento || f.dataVencimento || '').slice(0, 10);
      return venc === hoje && _iaStatusAberto(f.status) && /(boleto|conta|duplicata|pagar|nf|fornecedor|saida|saída)/.test(tipo);
    });
    if (!itens.length) return 'Nao ha boleto/conta a pagar vencendo hoje registrado no financeiro da oficina.';
    const total = itens.reduce((s, f) => s + _iaNum(f.valor), 0);
    return `Boletos/contas vencendo hoje (${hoje}):<br>${itens.map(_iaLinhaFin).join('<br>')}<br><br><strong>Total:</strong> ${_iaMoeda(total)}`;
  }

  if (/(boleto|conta|titulo|duplicata).*(vencid|atrasad)|inadimpl/.test(q)) {
    const itens = fin.filter(f => {
      const venc = String(f.venc || f.vencimento || f.dataVencimento || '').slice(0, 10);
      return venc && venc < hoje && _iaStatusAberto(f.status);
    });
    if (!itens.length) return 'Nao ha contas vencidas registradas no financeiro da oficina.';
    const total = itens.reduce((s, f) => s + _iaNum(f.valor), 0);
    return `Contas vencidas encontradas:<br>${itens.slice(0, 20).map(_iaLinhaFin).join('<br>')}<br><br><strong>Total vencido:</strong> ${_iaMoeda(total)}`;
  }

  if (/estoque.*(baixo|critico|minimo|comprar)|pecas?.*(baixo|critico|minimo)/.test(q)) {
    const itens = estoque.filter(p => _iaNum(p.qtd) <= _iaNum(p.min || p.minimo || 0));
    if (!itens.length) return 'Nao ha peca abaixo do minimo registrada no estoque.';
    return `Pecas abaixo do minimo:<br>${itens.slice(0, 25).map(p => `- ${p.codigo ? '[' + p.codigo + '] ' : ''}${p.desc || p.descricao || 'Peca'} | saldo ${p.qtd || 0} | minimo ${p.min || p.minimo || 0}`).join('<br>')}`;
  }

  const placa = (pergunta.match(/[A-Z]{3}[-\s]?\d[A-Z0-9]\d{2}/i) || [])[0];
  if (placa && /(status|situacao|onde|como esta|os|ordem)/.test(q)) {
    const placaLimpa = placa.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const found = os.filter(o => String(o.placa || '').toUpperCase().replace(/[^A-Z0-9]/g, '') === placaLimpa);
    if (!found.length) return `Nao ha O.S. registrada para a placa ${placaLimpa}.`;
    return found.slice(0, 5).map(o => `OS #${String(o.numero || o.id || '').slice(-6).toUpperCase()} | ${o.placa || placaLimpa} | status ${o.status || 'sem status'} | cliente ${o.cliente || 'sem cliente'} | entrada ${o.data || o.createdAt || '-'}`).join('<br>');
  }

  if (/quantas?.*(os|ordens).*(abert|andamento|patio)|os.*(abert|andamento|patio)/.test(q)) {
    const ativas = os.filter(o => !/entregue|cancelad/.test(_iaNorm(o.status)));
    return `Ha ${ativas.length} O.S. ativa(s) no patio/fluxo. Por status:<br>` +
      Object.entries(ativas.reduce((acc, o) => { const k = o.status || 'Sem status'; acc[k] = (acc[k] || 0) + 1; return acc; }, {}))
        .map(([k, v]) => `- ${k}: ${v}`).join('<br>');
  }

  return null;
};

window.iaPerguntar = async function() {
  const msg = window._v ? window._v('iaInput') : (document.getElementById('iaInput')?.value.trim() || '');
  if(!msg) return;
  if(window._sv) window._sv('iaInput',''); else { const el=document.getElementById('iaInput'); if(el) el.value=''; }

  window.adicionarMsgIA('user', msg);
  window.adicionarMsgIA('bot', '<span class="spinner" style="display:inline-block;width:14px;height:14px;border:2px solid var(--cyan);border-right-color:transparent;border-radius:50%;animation:jspin 0.8s linear infinite;vertical-align:middle;margin-right:6px;"></span> Acessando base de dados...');

  const localResp = window.thiaResponderLocal ? window.thiaResponderLocal(msg) : null;
  if (localResp) {
    const lastBotMsg = document.getElementById('iaMsgs').lastChild;
    if(lastBotMsg) lastBotMsg.remove();
    window.adicionarMsgIA('bot', localResp);
    window.iaHistorico.push({role: 'user', text: msg});
    window.iaHistorico.push({role: 'model', text: String(localResp).replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')});
    return;
  }

  const key = window.J && window.J.gemini;
  if(!key || !String(key).trim()){
    // Mensagem honesta: explica exatamente O QUE ESTÁ FALTANDO e COMO RESOLVER
    const lastBotMsg = document.getElementById('iaMsgs').lastChild;
    if(lastBotMsg) lastBotMsg.remove();
    
    const role = (window.J && window.J.role) || '';
    let instr = '';
    if(role === 'admin' || role === 'superadmin'){
      instr = '<br><br><strong>Como resolver:</strong><br>' +
              '1. Entre no Firebase Console → Firestore Database<br>' +
              '2. Coleção <code>oficinas</code> → documento da sua oficina<br>' +
              '3. Adicione o campo <code>apiKeys.gemini</code> (tipo: map) com sua chave Gemini<br>' +
              '4. Pegue uma chave grátis em <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:var(--cyan);text-decoration:underline">aistudio.google.com/app/apikey</a><br>' +
              '5. Faça logout e login novamente para recarregar a chave na sessão.';
    } else {
      instr = '<br><br>Peça ao administrador da oficina para configurar a chave Gemini no Firestore (campo <code>apiKeys.gemini</code> da coleção <code>oficinas</code>).';
    }
    window.adicionarMsgIA('bot', '⚠ <strong>Chave Gemini não configurada.</strong><br>Consultas objetivas locais continuam funcionando quando houver dados carregados, como boletos de hoje, O.S. por placa e estoque crítico.' + instr);
    if(window.toast) window.toast('⚠ Configure a chave Gemini para ativar a IA', 'warn');
    return;
  }

  if(!window.J || !Array.isArray(window.J.os)){
    const lastBotMsg = document.getElementById('iaMsgs').lastChild;
    if(lastBotMsg) lastBotMsg.remove();
    window.adicionarMsgIA('bot', '⚠ Base de dados ainda carregando. Aguarde alguns segundos e tente novamente.');
    return;
  }

  // 1. INJEÇÃO DA MEMÓRIA GLOBAL DO GESTOR (Últimos 24 meses + Estoque + Contexto de Auditoria + OBD2 + Timeline)
  let historyContext = "BASE DE DADOS DE SERVIÇOS DA OFICINA (Últimos 24 meses):\n";
  const limiteData = new Date();
  limiteData.setMonth(limiteData.getMonth() - 24);

  window.J.os.filter(o => {
      const dataOS = new Date(o.createdAt || o.data || o.updatedAt || Date.now());
      return dataOS > limiteData;
  }).forEach(o => {
      const v = (window.J.veiculos || []).find(x => x.id === o.veiculoId);
      historyContext += `[OS #${o.id.slice(-5).toUpperCase()} | Placa: ${v?.placa || o.placa || 'S/P'} | Data: ${o.data || 'N/A'} | Status: ${o.status}]\n`;
      historyContext += `- Relato/Diag: ${o.desc || 'N/A'} | ${o.diagnostico || 'N/A'}\n`;
      if (o.pecas && o.pecas.length > 0) historyContext += `- Pecas orcadas/registradas (nao tratar como trocadas sem execucao): ${o.pecas.map(p => p.desc).join(', ')}\n`;
      if (o.servicos && o.servicos.length > 0) historyContext += `- Servicos orcados/registrados (nao tratar como executados sem execucao): ${o.servicos.map(s => s.desc).join(', ')}\n`;
      
      // CIRURGIA DE DADOS: Injetando Códigos do Scanner OBD2 enviados pelo cliente
      if (o.dtcsCliente && o.dtcsCliente.length > 0) {
          const codigos = o.dtcsCliente.map(d => d.code || d).join(', ');
          historyContext += `- [Scanner do Cliente (OBD2): Erros Detectados -> ${codigos}]\n`;
      }
      
      // CIRURGIA DE DADOS: Injetando a Timeline (Deep Diff) para auditoria granular
      if (o.timeline && o.timeline.length > 0) {
          historyContext += `- Histórico Recente de Alterações:\n`;
          // Pega os 3 eventos mais recentes para não estourar os tokens desnecessariamente, mas garantindo auditoria
          const ultimosEventos = [...o.timeline].reverse().slice(0, 3);
          ultimosEventos.forEach(tl => {
              const dataFormatada = new Date(tl.dt).toLocaleString('pt-BR', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'});
              historyContext += `  * [${dataFormatada}] ${tl.user || tl.usuario}: ${tl.acao}\n`;
          });
      }

      historyContext += `- Valor Total: R$ ${o.total || 0}\n\n`;
  });

  const infoOficina = `Oficina: ${window.J.tnome}. Mecânicos ativos: ${(window.J.equipe||[]).map(f=>f.nome).join(', ') || '—'}. Veículos cadastrados: ${(window.J.veiculos||[]).length}. Peças críticas (abaixo do mínimo): ${(window.J.estoque||[]).filter(p=>(p.qtd||0)<=(p.min||0)).map(p=>p.desc).join(', ') || 'nenhuma'}.`;

  // ═══════════════════════════════════════════════════════════════
  // INTEGRAÇÃO COM TABELA TEMPÁRIA (SINDIREPA-SP)
  // Se a pergunta envolve tempo/cobrança/preço/orçamento, consulta a tabela.
  // ═══════════════════════════════════════════════════════════════
  const brain = typeof window.thiaGetBrain === 'function' ? window.thiaGetBrain() : ((window.J?.oficina?.brain || window.J?.oficina?.cerebro) || {});
  const brainContext = [brain.contexto, brain.catalogos, brain.erros, brain.regras, brain.procedimentos].filter(Boolean).join('\n\n');
  let tempaContext = '';
  const intencaoTempo = /quanto.*(tempo|hora|cobr|custa|cust|valor|preço|preco)|valor.*(servi|cobr)|tabela.*tempa|sindirepa|orçamento|orcamento|qual.*tempo|tempo.*pad|hora.*serv/i.test(msg);
  if (intencaoTempo && typeof window.tempaConsultarParaIA === 'function') {
    try {
      const consulta = await window.tempaConsultarParaIA(msg);
      if (consulta && consulta.itens.length > 0) {
        tempaContext = `\n\n[TABELA TEMPÁRIA SINDIREPA-SP — RESULTADOS RELEVANTES PARA ESTA PERGUNTA (${consulta.total} itens)]\n${consulta.resumo}\n\n`;
      }
    } catch(e) {
      // Falha silenciosa — IA continua sem dados da Tabela
      console.warn('Tabela Tempária indisponível:', e);
    }
  }

  // 2. O PROMPT MESTRE (AUDITORIA E CONSULTORIA SÊNIOR — PADRÃO DOUTOR-IE / BOSCH PRO)
  const systemPrompt = `Você é o thIAguinho, o JARVIS Gestor Automotivo de alto nível.
Seu conhecimento técnico é padrão Doutor-IE e Bosch Mecânico Pro. Seu conhecimento analítico é nível Diretor Operacional SaaS.
Você ajuda o gestor da oficina a analisar lucratividade, investigar orçamentos e AUDITAR GARANTIAS.

DIRETRIZES DE AUDITORIA (EXTREMAMENTE IMPORTANTE):
1. Utilize a "BASE DE DADOS DE SERVIÇOS" fornecida abaixo para todas as respostas referentes a veículos e clientes específicos.
2. Se questionado sobre a quebra de uma peça ou diagnóstico de um carro (placa), VOCÊ É OBRIGADO a varrer a base de dados e verificar se essa placa já esteve na oficina e se essa peça já foi trocada anteriormente.
2.1. Nunca transforme item orçado ou aprovado em item trocado/executado. Só afirme troca/execução se existir status de execução registrado.
3. REGRAS DE GARANTIA PADRÃO DO MERCADO BRASILEIRO:
   - Amortecedores: 2 anos ou 50.000 km.
   - Kits de Amortecedor (batente, coifa, coxim): 3 meses ou 10.000 km.
   - Pastilhas e Discos de freio: 3 meses ou 5.000 km.
   - Motor/Injeção/Sensores: 3 meses (garantia legal).
4. ALERTE O GESTOR IMEDIATAMENTE (em negrito e destaque) caso identifique que um mecânico está pedindo para trocar algo que ainda esteja na garantia com base no histórico.
5. Explique tecnicamente por que a peça pode ter falhado prematuramente (reincidência) citando causas-raiz prováveis para evitar prejuízos à oficina.
6. Se for uma análise financeira ou de estoque, forneça insights diretos baseados nos dados do "Cenário Atual".
7. CRUZAMENTO DE DADOS OBD2 E HISTÓRICO: Verifique os códigos de erro (DTC) que o cliente relatou via scanner e a timeline de alterações na O.S. Compare com as Peças e Serviços executados pelo mecânico. Alerte o gestor IMEDIATAMENTE se a oficina estiver trocando peças que não têm relação técnica com o código de falha do scanner ou se o mecânico modificou quantidades de forma suspeita.

Cenário Atual da Oficina: ${infoOficina}
${brainContext ? '\n\nCEREBRO TREINADO DA OFICINA:\n' + brainContext : ''}
${tempaContext}
${historyContext}

Responda sempre em português do Brasil, de forma clínica, técnica e sem alucinar dados não existentes na base.

REGRAS DA TABELA TEMPÁRIA SINDIREPA-SP:
- Quando o gestor perguntar sobre tempo de serviço, cobrança ou orçamento, USE OS DADOS DA "TABELA TEMPÁRIA" ACIMA (se fornecidos).
- A tabela contém os tempos PADRÃO em horas (ex: 0,5h = 30min, 1,5h = 1h30min).
- O preço final é tempo × valor da hora-mecânica da oficina (você pode sugerir R$ 80-150/h como referência se a oficina não definiu).
- NUNCA INVENTE TEMPOS — se a tabela não tem o item, diga "não consta na Tabela Tempária consultada" e sugira pesquisar manualmente.`;

  window.iaHistorico.push({role: 'user', text: msg});

  try {
    const contents = window.iaHistorico.map(h => ({role: h.role === 'user' ? 'user' : 'model', parts: [{text: h.text}]}));
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(key)}`, {
      method: 'POST', 
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
          contents, 
          systemInstruction: {parts: [{text: systemPrompt}]},
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048
          },
          // Safety settings permissivos (BLOCK_ONLY_HIGH) — termos técnicos automotivos
          // não devem ser bloqueados (ex: "queima", "explosão de motor", etc.)
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
          ]
      })
    });

    const data = await res.json();
    if(!res.ok){
      const errMsg = data?.error?.message || `HTTP ${res.status}`;
      let dica = '';
      if(/API key not valid|API_KEY_INVALID/i.test(errMsg)) dica = '<br><br>A chave Gemini configurada é inválida ou expirou. Gere uma nova em <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:var(--cyan);text-decoration:underline">aistudio.google.com/app/apikey</a>.';
      else if(/quota|RESOURCE_EXHAUSTED/i.test(errMsg)) dica = '<br><br>Cota da chave Gemini esgotada. Aguarde o reset ou gere nova chave.';
      else if(/models\/gemini/i.test(errMsg) && /not found/i.test(errMsg)) dica = '<br><br>O modelo <code>gemini-2.0-flash</code> pode não estar disponível na sua região.';
      throw new Error(errMsg + dica);
    }

    // ═══ DIAGNÓSTICO ROBUSTO (mesmo padrão do equipe.html) ═══
    if (!data.candidates || data.candidates.length === 0) {
      const blockReason = data?.promptFeedback?.blockReason;
      throw new Error(blockReason
        ? `Pergunta bloqueada pela política de segurança (${blockReason}). Reformule sem termos sensíveis.`
        : 'A IA não retornou candidatos de resposta. Tente reformular.');
    }

    const candidate = data.candidates[0];
    const finishReason = candidate.finishReason;
    let resp = candidate.content?.parts?.map(p => p.text).filter(Boolean).join('\n') || '';

    if (!resp) {
      if (finishReason === 'SAFETY' || finishReason === 'BLOCKED') {
        const safetyRatings = candidate.safetyRatings || [];
        const bloqueado = safetyRatings.filter(r => r.blocked).map(r => r.category).join(', ');
        throw new Error(`Resposta bloqueada por filtro de segurança (${bloqueado || finishReason}). Reformule a pergunta de forma mais técnica.`);
      } else if (finishReason === 'MAX_TOKENS') {
        throw new Error('Resposta da IA ultrapassou o limite. Faça uma pergunta mais específica ou divida em partes.');
      } else if (finishReason === 'RECITATION') {
        throw new Error('IA bloqueou por suspeita de citação direta. Reformule com suas próprias palavras.');
      } else {
        throw new Error(`A IA terminou sem texto (motivo: ${finishReason || 'desconhecido'}). Tente novamente.`);
      }
    }

    window.iaHistorico.push({role: 'model', text: resp});

    const lastBotMsg = document.getElementById('iaMsgs').lastChild;
    if(lastBotMsg) lastBotMsg.remove();
    
    window.adicionarMsgIA('bot', resp.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>'));
  } catch(e) {
    const lastBotMsg = document.getElementById('iaMsgs').lastChild;
    if(lastBotMsg) lastBotMsg.remove();
    window.adicionarMsgIA('bot', '⚠ Erro na IA: ' + (e.message || e));
  }
};

window.iaAnalisarDRE = function() {
  if(window._sv) window._sv('iaInput', 'Analise o financeiro atual e sugira melhorias e projeções.');
  else { const el=document.getElementById('iaInput'); if(el) el.value='Analise o financeiro atual e sugira melhorias e projeções.'; }
  if(window.ir) window.ir('ia');
  setTimeout(window.iaPerguntar, 200);
};

window.iaAnalisarEstoque = function() {
  if(window._sv) window._sv('iaInput', 'Quais peças estão em nível crítico para reposição? Sugira ações de compra.');
  else { const el=document.getElementById('iaInput'); if(el) el.value='Quais peças estão em nível crítico para reposição? Sugira ações de compra.'; }
  if(window.ir) window.ir('ia');
  setTimeout(window.iaPerguntar, 200);
};

window.adicionarMsgIA = function(role, html) {
  const el = document.getElementById('iaMsgs'); if(!el) return;
  const div = document.createElement('div'); div.className = 'ia-msg ' + role;
  if(role === 'bot') div.innerHTML = '<strong>thIAguinho:</strong> ' + html; else div.innerHTML = html;
  el.appendChild(div); el.scrollTop = el.scrollHeight;
};

document.getElementById('iaInput')?.addEventListener('keydown', e => {
  if(e.key === 'Enter') window.iaPerguntar();
});

/* Powered by thIAguinho Soluções Digitais */
