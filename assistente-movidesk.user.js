// ==UserScript==
// @name         Assistente de Atendimento - Preencher Movidesk
// @namespace    https://geovandev86.github.io/assistente-atendimento/
// @version      1.0
// @description  Preenche a ação do ticket com o resumo do Assistente de Atendimento. Nunca salva nada.
// @match        https://geovandev86.github.io/assistente-atendimento/*
// @match        https://skytechgroup.movidesk.com/Ticket/Edit/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @run-at       document-idle
// @updateURL    https://geovandev86.github.io/assistente-atendimento/assistente-movidesk.user.js
// @downloadURL  https://geovandev86.github.io/assistente-atendimento/assistente-movidesk.user.js
// ==/UserScript==

(function () {
    'use strict';

    const CHAVE = 'resumo_pendente';
    const VALIDADE_MS = 5 * 60 * 1000;
    const ESPERA_CAMPO_MS = 20000;

    if (location.hostname.endsWith('github.io')) {
        // Avisa a página que o preenchimento está instalado
        document.documentElement.dataset.preencherMovidesk = '1';

        window.addEventListener('message', (e) => {
            if (e.source !== window || e.origin !== location.origin) return;
            if (e.data?.tipo !== 'assistente-preencher-ticket') return;
            GM_setValue(CHAVE, { ticket: String(e.data.ticket), texto: String(e.data.texto), quando: Date.now() });
        });
        return;
    }

    const ticketAberto = (location.pathname.match(/\/Ticket\/Edit\/(\d+)/) || [])[1];

    function avisar(mensagem, cor) {
        const aviso = document.createElement('div');
        aviso.textContent = mensagem;
        aviso.style.cssText = `position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:99999;padding:10px 18px;border-radius:8px;background:${cor};color:#fff;font:600 14px sans-serif;box-shadow:0 2px 10px rgba(0,0,0,.3)`;
        document.body.appendChild(aviso);
        setTimeout(() => aviso.remove(), 8000);
    }

    function escaparHtml(texto) {
        return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    }

    function campoVisivel() {
        return [...document.querySelectorAll('.fr-element[contenteditable=true]')].find(c => c.getBoundingClientRect().height > 0);
    }

    function preencher(texto) {
        const campo = campoVisivel();
        if (!campo) return false;

        // Nunca escreve por cima do que a pessoa já digitou
        if (campo.textContent.trim()) {
            avisar('O campo já tem texto. Cole o resumo com Ctrl + V.', '#b45309');
            return true;
        }

        campo.focus();
        getSelection().selectAllChildren(campo);
        document.execCommand('insertHTML', false, escaparHtml(texto));
        avisar('Resumo preenchido. Confira e salve.', '#15803d');
        return true;
    }

    const inicio = Date.now();
    const espera = setInterval(() => {
        const pendente = GM_getValue(CHAVE, null);
        const valido = pendente && pendente.ticket === ticketAberto && Date.now() - pendente.quando < VALIDADE_MS;

        // A página pode gravar o resumo um instante depois de abrir esta aba
        if (!valido) {
            if (Date.now() - inicio > 5000) clearInterval(espera);
            return;
        }

        if (preencher(pendente.texto)) {
            GM_deleteValue(CHAVE);
            clearInterval(espera);
        } else if (Date.now() - inicio > ESPERA_CAMPO_MS) {
            avisar('Não encontrei o campo da ação. Cole o resumo com Ctrl + V.', '#b91c1c');
            GM_deleteValue(CHAVE);
            clearInterval(espera);
        }
    }, 300);
})();
