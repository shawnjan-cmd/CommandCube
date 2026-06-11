/**
 * Butler AI — Language / i18n Context
 * --------------------------------------------------------------
 * Lightweight, dependency-free i18n provider.
 *
 *  • 12 first-class languages (covers > 75% of global mobile users)
 *  • Auto-detects device locale on first launch
 *  • Persists choice to AsyncStorage (`@butler_language_v1`)
 *  • Falls back to English for any missing key
 *  • RTL support for Arabic / Hebrew
 *
 * Usage:
 *   const { t, lang, setLang, langs } = useLanguage();
 *   <Text>{t('cta.getStarted')}</Text>
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { I18nManager, Platform, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const LANGUAGE_KEY = '@butler_language_v1';

export type LangCode =
  | 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt'
  | 'ru' | 'zh' | 'ja' | 'ko' | 'ar' | 'hi';

export interface LangMeta {
  code: LangCode;
  /** Native script name shown in the picker */
  native: string;
  /** English name shown as secondary label */
  english: string;
  /** Flag emoji */
  flag: string;
  /** Right-to-left script */
  rtl?: boolean;
}

export const LANGUAGES: LangMeta[] = [
  { code: 'en', native: 'English',    english: 'English',    flag: '🇬🇧' },
  { code: 'es', native: 'Español',    english: 'Spanish',    flag: '🇪🇸' },
  { code: 'fr', native: 'Français',   english: 'French',     flag: '🇫🇷' },
  { code: 'de', native: 'Deutsch',    english: 'German',     flag: '🇩🇪' },
  { code: 'it', native: 'Italiano',   english: 'Italian',    flag: '🇮🇹' },
  { code: 'pt', native: 'Português',  english: 'Portuguese', flag: '🇵🇹' },
  { code: 'ru', native: 'Русский',    english: 'Russian',    flag: '🇷🇺' },
  { code: 'zh', native: '中文',        english: 'Chinese',    flag: '🇨🇳' },
  { code: 'ja', native: '日本語',      english: 'Japanese',   flag: '🇯🇵' },
  { code: 'ko', native: '한국어',      english: 'Korean',     flag: '🇰🇷' },
  { code: 'ar', native: 'العربية',     english: 'Arabic',     flag: '🇸🇦', rtl: true },
  { code: 'hi', native: 'हिन्दी',       english: 'Hindi',      flag: '🇮🇳' },
];

// ─────────────────────────────────────────────────────────────
// Translation dictionary
// ─────────────────────────────────────────────────────────────
// Strategy: translate UI chrome (titles, CTAs, step labels, accept
// gates, picker UI) — the strings a non-English user MUST understand
// to navigate the onboarding safely. Dense technical body copy stays
// in English (with a localized notice) because mistranslating
// security-sensitive phrasing is more harmful than leaving it in
// English. This is industry-standard for technical/dev tools.
// ─────────────────────────────────────────────────────────────

type Dict = Record<string, string>;

const en: Dict = {
  'picker.title':            'Choose your language',
  'picker.subtitle':         'You can change this anytime in Settings',
  'picker.notice':           'Technical setup details remain in English for accuracy. All buttons, steps & consent are translated.',
  'picker.current':          'Language',
  'picker.done':             'Done',

  'tagline':                 'REMOTE PC AUTOMATION · LOCAL AI · NO CLOUD',

  // Step labels (also drives the progress dots)
  'step.welcome':            'Welcome',
  'step.tour':               'App Tour',
  'step.consent':            'Safety Consent',
  'step.pledge':             'Safety Pledge',
  'step.legal':              'Legal Docs',
  'step.permissions':        'Permissions',
  'step.qa':                 'Q & A',
  'step.serverPrivacy':      'Server Privacy',
  'step.download':           'Download Setup',
  'step.done':               'All Done',

  // CTAs
  'cta.getStarted':          'GET STARTED',
  'cta.continue':            'CONTINUE',
  'cta.review':              'REVIEW GUIDE AGAIN',
  'cta.back':                'BACK',
  'cta.next':                'NEXT',
  'cta.accept':              'I ACCEPT',
  'cta.acceptAll':           'I ACCEPT ALL',
  'cta.openButler':          'OPEN BUTLER AI',
  'cta.continueDownload':    'CONTINUE TO DOWNLOAD SETUP',

  // Server Privacy acceptance gate
  'srv.gateTitle':           'PLEASE CONFIRM TO CONTINUE',
  'srv.gateSubtitle':        'These four points describe exactly what the Butler server does on your PC. Tap each to acknowledge.',
  'srv.accept.lan':          'I understand the server binds to my LAN only and is NEVER exposed to the public internet.',
  'srv.accept.local':        'I understand all my data (scripts, logs, knowledge base) stays in a local SQLite file on MY computer.',
  'srv.accept.install':      'I authorise the installer to download Python, Ollama and the AI model from their official sources (python.org, ollama.com, pypi.org).',
  'srv.accept.exec':         'I understand scripts run with MY user permissions on MY PC, and I am responsible for what I execute.',
  'srv.acceptedBadge':       'SERVER PRIVACY ACCEPTED',
  'srv.tapToAccept':         'TAP ALL 4 BOXES TO UNLOCK CONTINUE',
};

// Spanish
const es: Dict = {
  'picker.title':            'Elige tu idioma',
  'picker.subtitle':         'Puedes cambiarlo en cualquier momento en Ajustes',
  'picker.notice':           'Los detalles técnicos de instalación permanecen en inglés por precisión. Todos los botones, pasos y consentimientos están traducidos.',
  'picker.current':          'Idioma',
  'picker.done':             'Hecho',
  'tagline':                 'AUTOMATIZACIÓN PC REMOTA · IA LOCAL · SIN NUBE',
  'step.welcome':            'Bienvenido',
  'step.tour':               'Tour de la App',
  'step.consent':            'Consentimiento',
  'step.pledge':             'Compromiso',
  'step.legal':              'Documentos Legales',
  'step.permissions':        'Permisos',
  'step.qa':                 'Preguntas',
  'step.serverPrivacy':      'Privacidad Servidor',
  'step.download':           'Instalación',
  'step.done':               'Listo',
  'cta.getStarted':          'EMPEZAR',
  'cta.continue':            'CONTINUAR',
  'cta.review':              'REVISAR GUÍA',
  'cta.back':                'ATRÁS',
  'cta.next':                'SIGUIENTE',
  'cta.accept':              'ACEPTO',
  'cta.acceptAll':           'ACEPTO TODO',
  'cta.openButler':          'ABRIR BUTLER AI',
  'cta.continueDownload':    'CONTINUAR A INSTALACIÓN',
  'srv.gateTitle':           'CONFIRMA PARA CONTINUAR',
  'srv.gateSubtitle':        'Estos cuatro puntos describen exactamente lo que hace el servidor Butler en tu PC. Toca cada uno para aceptar.',
  'srv.accept.lan':          'Entiendo que el servidor se conecta sólo a mi red local y NUNCA se expone a Internet pública.',
  'srv.accept.local':        'Entiendo que todos mis datos (scripts, registros, base de conocimientos) se quedan en un archivo SQLite local en MI ordenador.',
  'srv.accept.install':      'Autorizo al instalador a descargar Python, Ollama y el modelo de IA desde sus fuentes oficiales (python.org, ollama.com, pypi.org).',
  'srv.accept.exec':         'Entiendo que los scripts se ejecutan con MIS permisos en MI PC y soy responsable de lo que ejecuto.',
  'srv.acceptedBadge':       'PRIVACIDAD DEL SERVIDOR ACEPTADA',
  'srv.tapToAccept':         'TOCA LAS 4 CASILLAS PARA DESBLOQUEAR',
};

// French
const fr: Dict = {
  'picker.title':            'Choisissez votre langue',
  'picker.subtitle':         'Modifiable à tout moment dans les Paramètres',
  'picker.notice':           'Les détails techniques d\'installation restent en anglais pour la précision. Tous les boutons, étapes et consentements sont traduits.',
  'picker.current':          'Langue',
  'picker.done':             'Terminé',
  'tagline':                 'AUTOMATISATION PC À DISTANCE · IA LOCALE · SANS CLOUD',
  'step.welcome':            'Bienvenue',
  'step.tour':               'Visite',
  'step.consent':            'Consentement',
  'step.pledge':             'Engagement',
  'step.legal':              'Documents légaux',
  'step.permissions':        'Permissions',
  'step.qa':                 'Q & R',
  'step.serverPrivacy':      'Vie privée serveur',
  'step.download':           'Installation',
  'step.done':               'Terminé',
  'cta.getStarted':          'COMMENCER',
  'cta.continue':            'CONTINUER',
  'cta.review':              'REVOIR LE GUIDE',
  'cta.back':                'RETOUR',
  'cta.next':                'SUIVANT',
  'cta.accept':              'J\'ACCEPTE',
  'cta.acceptAll':           'J\'ACCEPTE TOUT',
  'cta.openButler':          'OUVRIR BUTLER AI',
  'cta.continueDownload':    'CONTINUER VERS L\'INSTALLATION',
  'srv.gateTitle':           'CONFIRMEZ POUR CONTINUER',
  'srv.gateSubtitle':        'Ces quatre points décrivent exactement ce que fait le serveur Butler sur votre PC. Touchez chacun pour accepter.',
  'srv.accept.lan':          'Je comprends que le serveur se lie uniquement à mon réseau local et n\'est JAMAIS exposé à Internet public.',
  'srv.accept.local':        'Je comprends que toutes mes données (scripts, journaux, base de connaissances) restent dans un fichier SQLite local sur MON ordinateur.',
  'srv.accept.install':      'J\'autorise l\'installateur à télécharger Python, Ollama et le modèle d\'IA depuis leurs sources officielles (python.org, ollama.com, pypi.org).',
  'srv.accept.exec':         'Je comprends que les scripts s\'exécutent avec MES permissions sur MON PC et que je suis responsable de ce que j\'exécute.',
  'srv.acceptedBadge':       'CONFIDENTIALITÉ SERVEUR ACCEPTÉE',
  'srv.tapToAccept':         'TOUCHEZ LES 4 CASES POUR DÉBLOQUER',
};

// German
const de: Dict = {
  'picker.title':            'Sprache auswählen',
  'picker.subtitle':         'Jederzeit in den Einstellungen änderbar',
  'picker.notice':           'Technische Installations-Details bleiben aus Genauigkeitsgründen auf Englisch. Alle Buttons, Schritte und Einwilligungen sind übersetzt.',
  'picker.current':          'Sprache',
  'picker.done':             'Fertig',
  'tagline':                 'REMOTE-PC-AUTOMATISIERUNG · LOKALE KI · OHNE CLOUD',
  'step.welcome':            'Willkommen',
  'step.tour':               'App-Tour',
  'step.consent':            'Einwilligung',
  'step.pledge':             'Versprechen',
  'step.legal':              'Rechtliches',
  'step.permissions':        'Berechtigungen',
  'step.qa':                 'F & A',
  'step.serverPrivacy':      'Server-Datenschutz',
  'step.download':           'Installation',
  'step.done':               'Fertig',
  'cta.getStarted':          'LOS GEHT\'S',
  'cta.continue':            'WEITER',
  'cta.review':              'GUIDE ERNEUT ANSEHEN',
  'cta.back':                'ZURÜCK',
  'cta.next':                'WEITER',
  'cta.accept':              'AKZEPTIEREN',
  'cta.acceptAll':           'ALLES AKZEPTIEREN',
  'cta.openButler':          'BUTLER AI ÖFFNEN',
  'cta.continueDownload':    'WEITER ZUR INSTALLATION',
  'srv.gateTitle':           'BITTE ZUM FORTFAHREN BESTÄTIGEN',
  'srv.gateSubtitle':        'Diese vier Punkte beschreiben genau, was der Butler-Server auf Ihrem PC macht. Tippen Sie jeden an, um zu bestätigen.',
  'srv.accept.lan':          'Ich verstehe, dass der Server sich nur an mein LAN bindet und NIEMALS dem öffentlichen Internet ausgesetzt ist.',
  'srv.accept.local':        'Ich verstehe, dass alle meine Daten (Skripte, Logs, Wissensbasis) in einer lokalen SQLite-Datei auf MEINEM Computer bleiben.',
  'srv.accept.install':      'Ich autorisiere den Installer, Python, Ollama und das KI-Modell von ihren offiziellen Quellen (python.org, ollama.com, pypi.org) herunterzuladen.',
  'srv.accept.exec':         'Ich verstehe, dass Skripte mit MEINEN Berechtigungen auf MEINEM PC laufen und ich für das verantwortlich bin, was ich ausführe.',
  'srv.acceptedBadge':       'SERVER-DATENSCHUTZ AKZEPTIERT',
  'srv.tapToAccept':         'TIPPEN SIE ALLE 4 KÄSTCHEN AN',
};

// Italian
const it: Dict = {
  'picker.title':            'Scegli la tua lingua',
  'picker.subtitle':         'Modificabile in qualsiasi momento nelle Impostazioni',
  'picker.notice':           'I dettagli tecnici di installazione restano in inglese per precisione. Tutti i pulsanti, passi e consensi sono tradotti.',
  'picker.current':          'Lingua',
  'picker.done':             'Fatto',
  'tagline':                 'AUTOMAZIONE PC REMOTA · IA LOCALE · SENZA CLOUD',
  'step.welcome':            'Benvenuto',
  'step.tour':               'Tour App',
  'step.consent':            'Consenso',
  'step.pledge':             'Impegno',
  'step.legal':              'Documenti Legali',
  'step.permissions':        'Permessi',
  'step.qa':                 'D & R',
  'step.serverPrivacy':      'Privacy Server',
  'step.download':           'Installazione',
  'step.done':               'Pronto',
  'cta.getStarted':          'INIZIA',
  'cta.continue':            'CONTINUA',
  'cta.review':              'RIVEDI GUIDA',
  'cta.back':                'INDIETRO',
  'cta.next':                'AVANTI',
  'cta.accept':              'ACCETTO',
  'cta.acceptAll':           'ACCETTO TUTTO',
  'cta.openButler':          'APRI BUTLER AI',
  'cta.continueDownload':    'CONTINUA INSTALLAZIONE',
  'srv.gateTitle':           'CONFERMA PER CONTINUARE',
  'srv.gateSubtitle':        'Questi quattro punti descrivono esattamente cosa fa il server Butler sul tuo PC. Tocca ciascuno per accettare.',
  'srv.accept.lan':          'Capisco che il server si lega solo alla mia LAN e NON viene MAI esposto a Internet pubblica.',
  'srv.accept.local':        'Capisco che tutti i miei dati (script, log, knowledge base) restano in un file SQLite locale sul MIO computer.',
  'srv.accept.install':      'Autorizzo l\'installer a scaricare Python, Ollama e il modello IA dalle loro fonti ufficiali (python.org, ollama.com, pypi.org).',
  'srv.accept.exec':         'Capisco che gli script vengono eseguiti con I MIEI permessi sul MIO PC e sono responsabile di ciò che eseguo.',
  'srv.acceptedBadge':       'PRIVACY SERVER ACCETTATA',
  'srv.tapToAccept':         'TOCCA TUTTE E 4 LE CASELLE',
};

// Portuguese
const pt: Dict = {
  'picker.title':            'Escolha o seu idioma',
  'picker.subtitle':         'Pode alterar a qualquer momento em Definições',
  'picker.notice':           'Detalhes técnicos de instalação permanecem em inglês para precisão. Todos os botões, passos e consentimentos estão traduzidos.',
  'picker.current':          'Idioma',
  'picker.done':             'Concluído',
  'tagline':                 'AUTOMAÇÃO PC REMOTA · IA LOCAL · SEM NUVEM',
  'step.welcome':            'Bem-vindo',
  'step.tour':               'Tour da App',
  'step.consent':            'Consentimento',
  'step.pledge':             'Compromisso',
  'step.legal':              'Documentos Legais',
  'step.permissions':        'Permissões',
  'step.qa':                 'Perguntas',
  'step.serverPrivacy':      'Privacidade do Servidor',
  'step.download':           'Instalação',
  'step.done':               'Concluído',
  'cta.getStarted':          'COMEÇAR',
  'cta.continue':            'CONTINUAR',
  'cta.review':              'REVER GUIA',
  'cta.back':                'VOLTAR',
  'cta.next':                'SEGUINTE',
  'cta.accept':              'ACEITO',
  'cta.acceptAll':           'ACEITO TUDO',
  'cta.openButler':          'ABRIR BUTLER AI',
  'cta.continueDownload':    'CONTINUAR PARA INSTALAÇÃO',
  'srv.gateTitle':           'CONFIRME PARA CONTINUAR',
  'srv.gateSubtitle':        'Estes quatro pontos descrevem exatamente o que o servidor Butler faz no seu PC. Toque em cada um para aceitar.',
  'srv.accept.lan':          'Compreendo que o servidor se liga apenas à minha LAN e NUNCA é exposto à Internet pública.',
  'srv.accept.local':        'Compreendo que todos os meus dados (scripts, registos, base de conhecimento) permanecem num ficheiro SQLite local no MEU computador.',
  'srv.accept.install':      'Autorizo o instalador a transferir Python, Ollama e o modelo IA das fontes oficiais (python.org, ollama.com, pypi.org).',
  'srv.accept.exec':         'Compreendo que os scripts são executados com AS MINHAS permissões no MEU PC e sou responsável pelo que executo.',
  'srv.acceptedBadge':       'PRIVACIDADE DO SERVIDOR ACEITE',
  'srv.tapToAccept':         'TOQUE NAS 4 CAIXAS',
};

// Russian
const ru: Dict = {
  'picker.title':            'Выберите язык',
  'picker.subtitle':         'Можно изменить в любое время в Настройках',
  'picker.notice':           'Технические детали установки остаются на английском для точности. Все кнопки, шаги и согласия переведены.',
  'picker.current':          'Язык',
  'picker.done':             'Готово',
  'tagline':                 'УДАЛЁННАЯ АВТОМАТИЗАЦИЯ ПК · ЛОКАЛЬНЫЙ ИИ · БЕЗ ОБЛАКА',
  'step.welcome':            'Добро пожаловать',
  'step.tour':               'Обзор',
  'step.consent':            'Согласие',
  'step.pledge':             'Обязательство',
  'step.legal':              'Документы',
  'step.permissions':        'Разрешения',
  'step.qa':                 'Вопросы',
  'step.serverPrivacy':      'Приватность сервера',
  'step.download':           'Установка',
  'step.done':               'Готово',
  'cta.getStarted':          'НАЧАТЬ',
  'cta.continue':            'ПРОДОЛЖИТЬ',
  'cta.review':              'СНОВА ПОСМОТРЕТЬ',
  'cta.back':                'НАЗАД',
  'cta.next':                'ДАЛЕЕ',
  'cta.accept':              'ПРИНИМАЮ',
  'cta.acceptAll':           'ПРИНИМАЮ ВСЁ',
  'cta.openButler':          'ОТКРЫТЬ BUTLER AI',
  'cta.continueDownload':    'ПЕРЕЙТИ К УСТАНОВКЕ',
  'srv.gateTitle':           'ПОДТВЕРДИТЕ ДЛЯ ПРОДОЛЖЕНИЯ',
  'srv.gateSubtitle':        'Эти четыре пункта точно описывают, что сервер Butler делает на вашем ПК. Коснитесь каждого, чтобы подтвердить.',
  'srv.accept.lan':          'Я понимаю, что сервер привязывается только к моей локальной сети и НИКОГДА не открывается в публичный интернет.',
  'srv.accept.local':        'Я понимаю, что все мои данные (скрипты, логи, база знаний) остаются в локальном SQLite-файле на МОЁМ компьютере.',
  'srv.accept.install':      'Я разрешаю установщику загружать Python, Ollama и модель ИИ из официальных источников (python.org, ollama.com, pypi.org).',
  'srv.accept.exec':         'Я понимаю, что скрипты запускаются с МОИМИ разрешениями на МОЁМ ПК, и я отвечаю за то, что выполняю.',
  'srv.acceptedBadge':       'ПРИВАТНОСТЬ СЕРВЕРА ПРИНЯТА',
  'srv.tapToAccept':         'НАЖМИТЕ ВСЕ 4 ФЛАЖКА',
};

// Chinese (Simplified)
const zh: Dict = {
  'picker.title':            '选择您的语言',
  'picker.subtitle':         '随时可在设置中更改',
  'picker.notice':           '技术安装细节保留英文以确保准确性。所有按钮、步骤和同意书均已翻译。',
  'picker.current':          '语言',
  'picker.done':             '完成',
  'tagline':                 '远程 PC 自动化 · 本地 AI · 无云端',
  'step.welcome':            '欢迎',
  'step.tour':               '应用导览',
  'step.consent':            '安全同意',
  'step.pledge':             '安全承诺',
  'step.legal':              '法律文件',
  'step.permissions':        '权限',
  'step.qa':                 '问答',
  'step.serverPrivacy':      '服务器隐私',
  'step.download':           '下载安装',
  'step.done':               '全部完成',
  'cta.getStarted':          '开始',
  'cta.continue':            '继续',
  'cta.review':              '再次查看指南',
  'cta.back':                '返回',
  'cta.next':                '下一步',
  'cta.accept':              '我接受',
  'cta.acceptAll':           '我全部接受',
  'cta.openButler':          '打开 BUTLER AI',
  'cta.continueDownload':    '继续到下载安装',
  'srv.gateTitle':           '请确认以继续',
  'srv.gateSubtitle':        '这四点准确描述了 Butler 服务器在您的 PC 上的行为。请点击每项以确认。',
  'srv.accept.lan':          '我了解服务器仅绑定我的局域网,绝不暴露于公共互联网。',
  'srv.accept.local':        '我了解我的所有数据(脚本、日志、知识库)都保存在我电脑上的本地 SQLite 文件中。',
  'srv.accept.install':      '我授权安装程序从官方来源 (python.org, ollama.com, pypi.org) 下载 Python、Ollama 和 AI 模型。',
  'srv.accept.exec':         '我了解脚本以我的权限在我的 PC 上运行,我对执行的内容负责。',
  'srv.acceptedBadge':       '服务器隐私已接受',
  'srv.tapToAccept':         '点击所有 4 个复选框',
};

// Japanese
const ja: Dict = {
  'picker.title':            '言語を選択',
  'picker.subtitle':         '設定からいつでも変更できます',
  'picker.notice':           '技術的なインストール詳細は正確性のため英語のままです。すべてのボタン、ステップ、同意は翻訳されています。',
  'picker.current':          '言語',
  'picker.done':             '完了',
  'tagline':                 'リモート PC 自動化 · ローカル AI · クラウド不要',
  'step.welcome':            'ようこそ',
  'step.tour':               'アプリツアー',
  'step.consent':            '安全同意',
  'step.pledge':             '安全宣言',
  'step.legal':              '法的文書',
  'step.permissions':        '権限',
  'step.qa':                 'Q & A',
  'step.serverPrivacy':      'サーバーのプライバシー',
  'step.download':           'ダウンロード',
  'step.done':               '完了',
  'cta.getStarted':          'はじめる',
  'cta.continue':            '次へ',
  'cta.review':              'ガイドを再確認',
  'cta.back':                '戻る',
  'cta.next':                '次',
  'cta.accept':              '同意します',
  'cta.acceptAll':           'すべて同意',
  'cta.openButler':          'BUTLER AI を開く',
  'cta.continueDownload':    'ダウンロード設定へ',
  'srv.gateTitle':           '続行するには確認してください',
  'srv.gateSubtitle':        'この4つの項目は、Butler サーバーが PC で行う動作を正確に示しています。各項目をタップして承認してください。',
  'srv.accept.lan':          'サーバーはローカル LAN にのみバインドされ、公衆インターネットには決して公開されないことを理解しています。',
  'srv.accept.local':        'スクリプト、ログ、ナレッジベースを含むすべてのデータが、私のコンピュータのローカル SQLite ファイルに保存されることを理解しています。',
  'srv.accept.install':      'インストーラーが公式ソース (python.org, ollama.com, pypi.org) から Python、Ollama、AI モデルをダウンロードすることを承認します。',
  'srv.accept.exec':         'スクリプトは私の PC で私の権限で実行され、実行する内容について私が責任を負うことを理解しています。',
  'srv.acceptedBadge':       'サーバーのプライバシーが承認されました',
  'srv.tapToAccept':         '4 つすべてのボックスをタップ',
};

// Korean
const ko: Dict = {
  'picker.title':            '언어 선택',
  'picker.subtitle':         '설정에서 언제든지 변경할 수 있습니다',
  'picker.notice':           '기술적 설치 세부 정보는 정확성을 위해 영어로 유지됩니다. 모든 버튼, 단계, 동의는 번역되어 있습니다.',
  'picker.current':          '언어',
  'picker.done':             '완료',
  'tagline':                 '원격 PC 자동화 · 로컬 AI · 클라우드 없음',
  'step.welcome':            '환영',
  'step.tour':               '앱 둘러보기',
  'step.consent':            '안전 동의',
  'step.pledge':             '안전 서약',
  'step.legal':              '법적 문서',
  'step.permissions':        '권한',
  'step.qa':                 'Q & A',
  'step.serverPrivacy':      '서버 개인정보',
  'step.download':           '다운로드 설정',
  'step.done':               '완료',
  'cta.getStarted':          '시작하기',
  'cta.continue':            '계속',
  'cta.review':              '가이드 다시 보기',
  'cta.back':                '뒤로',
  'cta.next':                '다음',
  'cta.accept':              '동의합니다',
  'cta.acceptAll':           '모두 동의',
  'cta.openButler':          'BUTLER AI 열기',
  'cta.continueDownload':    '다운로드 설정으로 계속',
  'srv.gateTitle':           '계속하려면 확인하세요',
  'srv.gateSubtitle':        '이 네 가지 항목은 Butler 서버가 PC에서 수행하는 작업을 정확하게 설명합니다. 각 항목을 탭하여 승인하세요.',
  'srv.accept.lan':          '서버가 내 LAN에만 바인딩되며 공용 인터넷에 절대 노출되지 않음을 이해합니다.',
  'srv.accept.local':        '내 모든 데이터(스크립트, 로그, 지식 베이스)가 내 컴퓨터의 로컬 SQLite 파일에 보관됨을 이해합니다.',
  'srv.accept.install':      '설치 프로그램이 공식 소스(python.org, ollama.com, pypi.org)에서 Python, Ollama 및 AI 모델을 다운로드하도록 승인합니다.',
  'srv.accept.exec':         '스크립트가 내 PC에서 내 권한으로 실행되며, 실행하는 내용에 대해 내가 책임진다는 것을 이해합니다.',
  'srv.acceptedBadge':       '서버 개인정보 보호 동의됨',
  'srv.tapToAccept':         '4개 체크박스 모두 탭',
};

// Arabic (RTL)
const ar: Dict = {
  'picker.title':            'اختر لغتك',
  'picker.subtitle':         'يمكنك تغييرها في أي وقت من الإعدادات',
  'picker.notice':           'تبقى تفاصيل التثبيت التقنية بالإنجليزية للدقة. تمت ترجمة جميع الأزرار والخطوات والموافقات.',
  'picker.current':          'اللغة',
  'picker.done':             'تم',
  'tagline':                 'أتمتة الكمبيوتر عن بُعد · ذكاء اصطناعي محلي · بدون سحابة',
  'step.welcome':            'مرحباً',
  'step.tour':               'جولة التطبيق',
  'step.consent':            'موافقة الأمان',
  'step.pledge':             'تعهد الأمان',
  'step.legal':              'الوثائق القانونية',
  'step.permissions':        'الأذونات',
  'step.qa':                 'أسئلة وأجوبة',
  'step.serverPrivacy':      'خصوصية الخادم',
  'step.download':           'إعداد التنزيل',
  'step.done':               'تم الانتهاء',
  'cta.getStarted':          'ابدأ',
  'cta.continue':            'متابعة',
  'cta.review':              'مراجعة الدليل',
  'cta.back':                'رجوع',
  'cta.next':                'التالي',
  'cta.accept':              'أوافق',
  'cta.acceptAll':           'أوافق على الكل',
  'cta.openButler':          'فتح BUTLER AI',
  'cta.continueDownload':    'متابعة إلى التنزيل',
  'srv.gateTitle':           'يرجى التأكيد للمتابعة',
  'srv.gateSubtitle':        'تصف هذه النقاط الأربع بالضبط ما يفعله خادم Butler على جهازك. اضغط على كل واحدة للموافقة.',
  'srv.accept.lan':          'أفهم أن الخادم يرتبط بشبكتي المحلية فقط ولا يتعرض أبداً للإنترنت العام.',
  'srv.accept.local':        'أفهم أن جميع بياناتي (السكربتات، السجلات، قاعدة المعرفة) تبقى في ملف SQLite محلي على جهازي.',
  'srv.accept.install':      'أصرح للمثبت بتنزيل Python و Ollama ونموذج الذكاء الاصطناعي من مصادرها الرسمية (python.org, ollama.com, pypi.org).',
  'srv.accept.exec':         'أفهم أن السكربتات تعمل بأذوناتي على جهازي، وأنا مسؤول عما أنفذه.',
  'srv.acceptedBadge':       'تمت الموافقة على خصوصية الخادم',
  'srv.tapToAccept':         'اضغط على جميع المربعات الأربعة',
};

// Hindi
const hi: Dict = {
  'picker.title':            'अपनी भाषा चुनें',
  'picker.subtitle':         'आप इसे कभी भी सेटिंग्स में बदल सकते हैं',
  'picker.notice':           'सटीकता के लिए तकनीकी इंस्टॉलेशन विवरण अंग्रेजी में रहते हैं। सभी बटन, चरण और सहमतियां अनुवादित हैं।',
  'picker.current':          'भाषा',
  'picker.done':             'पूर्ण',
  'tagline':                 'रिमोट PC ऑटोमेशन · लोकल AI · नो क्लाउड',
  'step.welcome':            'स्वागत है',
  'step.tour':               'ऐप टूर',
  'step.consent':            'सुरक्षा सहमति',
  'step.pledge':             'सुरक्षा प्रतिज्ञा',
  'step.legal':              'कानूनी दस्तावेज़',
  'step.permissions':        'अनुमतियाँ',
  'step.qa':                 'प्रश्नोत्तर',
  'step.serverPrivacy':      'सर्वर गोपनीयता',
  'step.download':           'डाउनलोड सेटअप',
  'step.done':               'सब तैयार',
  'cta.getStarted':          'शुरू करें',
  'cta.continue':            'जारी रखें',
  'cta.review':              'गाइड फिर देखें',
  'cta.back':                'वापस',
  'cta.next':                'अगला',
  'cta.accept':              'स्वीकार है',
  'cta.acceptAll':           'सभी स्वीकार',
  'cta.openButler':          'BUTLER AI खोलें',
  'cta.continueDownload':    'डाउनलोड सेटअप पर जारी रखें',
  'srv.gateTitle':           'जारी रखने के लिए पुष्टि करें',
  'srv.gateSubtitle':        'ये चार बिंदु बिल्कुल वर्णन करते हैं कि Butler सर्वर आपके PC पर क्या करता है। स्वीकार करने के लिए प्रत्येक पर टैप करें।',
  'srv.accept.lan':          'मैं समझता हूँ कि सर्वर केवल मेरे LAN से जुड़ता है और कभी भी सार्वजनिक इंटरनेट पर उजागर नहीं होता।',
  'srv.accept.local':        'मैं समझता हूँ कि मेरा सारा डेटा (स्क्रिप्ट, लॉग, ज्ञान आधार) मेरे कंप्यूटर पर स्थानीय SQLite फ़ाइल में रहता है।',
  'srv.accept.install':      'मैं इंस्टॉलर को आधिकारिक स्रोतों (python.org, ollama.com, pypi.org) से Python, Ollama और AI मॉडल डाउनलोड करने के लिए अधिकृत करता हूँ।',
  'srv.accept.exec':         'मैं समझता हूँ कि स्क्रिप्ट मेरे PC पर मेरी अनुमतियों के साथ चलती हैं, और मैं जो निष्पादित करता हूँ उसके लिए मैं जिम्मेदार हूँ।',
  'srv.acceptedBadge':       'सर्वर गोपनीयता स्वीकृत',
  'srv.tapToAccept':         'सभी 4 बॉक्स टैप करें',
};

const DICTS: Record<LangCode, Dict> = { en, es, fr, de, it, pt, ru, zh, ja, ko, ar, hi };

// ─────────────────────────────────────────────────────────────
// Device locale detection
// ─────────────────────────────────────────────────────────────
function detectDeviceLang(): LangCode {
  try {
    const raw =
      Platform.OS === 'ios'
        ? (NativeModules.SettingsManager?.settings?.AppleLocale ||
           NativeModules.SettingsManager?.settings?.AppleLanguages?.[0])
        : NativeModules.I18nManager?.localeIdentifier;
    if (typeof raw === 'string') {
      const code = raw.toLowerCase().split(/[-_]/)[0] as LangCode;
      if (DICTS[code]) return code;
    }
  } catch {}
  return 'en';
}

// ─────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────
interface LanguageCtx {
  lang: LangCode;
  setLang: (code: LangCode) => Promise<void>;
  t: (key: string) => string;
  langs: LangMeta[];
  isRTL: boolean;
  ready: boolean;
}

const Ctx = createContext<LanguageCtx | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LangCode>('en');
  const [ready, setReady] = useState(false);

  // Hydrate from storage / device locale once
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
        if (saved && (DICTS as any)[saved]) {
          setLangState(saved as LangCode);
        } else {
          setLangState(detectDeviceLang());
        }
      } catch {
        setLangState('en');
      } finally {
        setReady(true);
      }
    })();
  }, []);

  // Apply RTL when needed (does not force-restart; new screens pick it up)
  useEffect(() => {
    const meta = LANGUAGES.find(l => l.code === lang);
    const wantRTL = !!meta?.rtl;
    try {
      if (I18nManager.isRTL !== wantRTL) {
        I18nManager.allowRTL(wantRTL);
        // forceRTL would require a reload; we don't auto-reload to avoid surprises.
      }
    } catch {}
  }, [lang]);

  const setLang = useCallback(async (code: LangCode) => {
    if (!DICTS[code]) return;
    setLangState(code);
    try { await AsyncStorage.setItem(LANGUAGE_KEY, code); } catch {}
  }, []);

  const t = useCallback(
    (key: string): string => {
      const dict = DICTS[lang] || en;
      return dict[key] ?? en[key] ?? key;
    },
    [lang],
  );

  const value = useMemo<LanguageCtx>(
    () => ({
      lang,
      setLang,
      t,
      langs: LANGUAGES,
      isRTL: !!LANGUAGES.find(l => l.code === lang)?.rtl,
      ready,
    }),
    [lang, setLang, t, ready],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLanguage(): LanguageCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Safe fallback so screens that forget the provider don't crash —
    // they just render English and a no-op setter.
    return {
      lang: 'en',
      setLang: async () => {},
      t: (k: string) => en[k] ?? k,
      langs: LANGUAGES,
      isRTL: false,
      ready: true,
    };
  }
  return ctx;
}
