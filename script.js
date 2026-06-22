/* ============================================================
   KnoW — Shared script.js
   Contains: mobile menu toggle, Firebase auth, formatText,
   addMessage, sendMessage, autoResize, clearChat, handleKeydown,
   initChat, All Rounder routing & API functions
   ============================================================ */

/* -----------------------------------------
   API KEYS (for All Rounder)
   ----------------------------------------- */
const KNOW_KEYS = {
  weather: 'OPENWEATHERMAP_KEY_HERE',
  news: 'GNEWS_KEY_HERE',
  nasa: 'NASA_KEY_HERE'
};

/* -----------------------------------------
   MOBILE MENU TOGGLE (shared, all pages)
   ----------------------------------------- */
function initMobileMenu() {
  const hamburger = document.querySelector('.hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  if (!hamburger || !mobileMenu) return;

  hamburger.addEventListener('click', function () {
    mobileMenu.classList.add('open');
  });

  const closeBtn = mobileMenu.querySelector('.mobile-menu-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', function () {
      mobileMenu.classList.remove('open');
    });
  }

  mobileMenu.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      mobileMenu.classList.remove('open');
    });
  });
}

/* -----------------------------------------
   FIREBASE AUTH (shared, all pages)
   ----------------------------------------- */
function initFirebaseAuth() {
  // Check if Firebase is loaded
  if (typeof firebase === 'undefined') return;

  const authContainer = document.getElementById('navAuth');
  if (!authContainer) return;

  firebase.auth().onAuthStateChanged(function (user) {
    if (user) {
      // User is signed in
      const displayName = user.displayName || user.email || 'User';
      const initial = displayName.charAt(0).toUpperCase();

      authContainer.innerHTML =
        '<div class="nav-user">' +
          '<div class="nav-avatar">' + initial + '</div>' +
          '<span class="nav-username">' + escapeHtml(displayName) + '</span>' +
          '<a class="nav-signout" id="signOutBtn">Sign Out</a>' +
        '</div>';

      document.getElementById('signOutBtn').addEventListener('click', function () {
        firebase.auth().signOut();
      });
    } else {
      // User is signed out
      authContainer.innerHTML =
        '<a class="nav-signin" id="signInBtn">Sign In</a>';

      document.getElementById('signInBtn').addEventListener('click', function () {
        window.location.href = 'auth.html';
      });
    }
  });
}

function escapeHtml(text) {
  var div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/* -----------------------------------------
   formatText — render markdown-ish syntax
   ----------------------------------------- */
function formatText(text) {
  if (!text) return '';

  const codeBlocks = [];
  let processed = text.replace(/```(\w+)?\n?([\s\S]*?)```/g, function (match, lang, code) {
    const idx = codeBlocks.length;
    codeBlocks.push({ lang: lang || '', code: code.replace(/\n$/, '') });
    return '\u0000CODEBLOCK' + idx + '\u0000';
  });

  processed = processed
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  processed = processed.replace(/^###\s+(.+)$/gm, '<strong class="md-h3">$1</strong>');
  processed = processed.replace(/^##\s+(.+)$/gm, '<strong class="md-h2">$1</strong>');
  processed = processed.replace(/^#\s+(.+)$/gm, '<strong class="md-h1">$1</strong>');
  processed = processed.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  processed = processed.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  processed = processed.replace(/`([^`]+)`/g, '<code>$1</code>');
  processed = processed.replace(/^[-*]\s+(.+)$/gm, '<span class="md-bullet">\u2022</span> $1');
  processed = processed.replace(/\n/g, '<br>');

  processed = processed.replace(/\u0000CODEBLOCK(\d+)\u0000/g, function (m, idx) {
    const entry = codeBlocks[parseInt(idx, 10)];
    const escaped = entry.code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const langLabel = entry.lang
      ? '<span class="code-lang">' + entry.lang + '</span>' : '';
    return '<div class="code-block">' + langLabel + '<pre><code>' + escaped + '</code></pre></div>';
  });

  return processed;
}

/* -----------------------------------------
   autoResize — auto-grow textarea height
   ----------------------------------------- */
function autoResize(textarea) {
  textarea.style.height = 'auto';
  const newHeight = Math.min(textarea.scrollHeight, 160);
  textarea.style.height = newHeight + 'px';
}

/* -----------------------------------------
   Chat state (per page)
   ----------------------------------------- */
let chatState = {
  config: null,
  history: [],
  systemPrompt: '',
  isSending: false
};

/* -----------------------------------------
   addMessage — render a message bubble
   ----------------------------------------- */
function addMessage(role, content) {
  const chatMessages = document.getElementById('chatMessages');
  if (!chatMessages) return null;

  const msg = document.createElement('div');
  msg.className = 'message ' + role;

  const label = document.createElement('div');
  label.className = 'message-label';
  label.textContent = role === 'user' ? 'You' : 'KnoW';

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';

  if (role === 'ai') {
    bubble.innerHTML = formatText(content);
  } else if (role === 'thinking') {
    bubble.textContent = 'Thinking...';
  } else {
    const escaped = String(content)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
    bubble.innerHTML = escaped;
  }

  msg.appendChild(label);
  msg.appendChild(bubble);
  chatMessages.appendChild(msg);

  chatMessages.scrollTop = chatMessages.scrollHeight;

  return msg;
}

/* -----------------------------------------
   addMessageHTML — for All Rounder API results
   renders pre-formatted HTML in the AI bubble
   ----------------------------------------- */
function addMessageHTML(role, htmlContent) {
  const chatMessages = document.getElementById('chatMessages');
  if (!chatMessages) return null;

  const msg = document.createElement('div');
  msg.className = 'message ' + role;

  const label = document.createElement('div');
  label.className = 'message-label';
  label.textContent = role === 'user' ? 'You' : 'KnoW';

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';

  if (role === 'ai') {
    bubble.innerHTML = htmlContent;
  } else if (role === 'thinking') {
    bubble.textContent = 'Thinking...';
  } else {
    const escaped = String(htmlContent)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
    bubble.innerHTML = escaped;
  }

  msg.appendChild(label);
  msg.appendChild(bubble);
  chatMessages.appendChild(msg);

  chatMessages.scrollTop = chatMessages.scrollHeight;

  return msg;
}

/* -----------------------------------------
   showEmptyState / hideEmptyState
   ----------------------------------------- */
function showEmptyState() {
  const emptyState = document.getElementById('emptyState');
  if (emptyState) emptyState.style.display = 'flex';

  const chatMessages = document.getElementById('chatMessages');
  if (chatMessages) {
    chatMessages.querySelectorAll('.message').forEach(function (m) { m.remove(); });
  }
}

function hideEmptyState() {
  const emptyState = document.getElementById('emptyState');
  if (emptyState) emptyState.style.display = 'none';
}

/* -----------------------------------------
   clearChat — reset history + show empty state
   ----------------------------------------- */
function clearChat() {
  chatState.history = [];
  showEmptyState();
}

/* -----------------------------------------
   sendMessage — main send handler (standard chat)
   ----------------------------------------- */
async function sendMessage() {
  if (chatState.isSending) return;

  const textarea = document.getElementById('messageInput');
  if (!textarea) return;

  const text = textarea.value.trim();
  if (!text) return;

  hideEmptyState();

  let userContent = text;
  if (chatState.history.length === 0 && chatState.systemPrompt) {
    userContent = chatState.systemPrompt + '\n\n' + text;
  }

  addMessage('user', text);
  chatState.history.push({ role: 'user', content: userContent });

  textarea.value = '';
  autoResize(textarea);

  chatState.isSending = true;
  const sendBtn = document.getElementById('sendBtn');
  if (sendBtn) sendBtn.disabled = true;

  const thinkingMsg = addMessage('thinking', '');

  let aiText = '';
  try {
    if (typeof puter === 'undefined' || !puter.ai || !puter.ai.chat) {
      throw new Error('Puter.js not loaded');
    }
    const response = await puter.ai.chat(chatState.history);
    aiText =
      (response && response.message && response.message.content && response.message.content[0] && response.message.content[0].text) ||
      (typeof response === 'string' ? response : '') ||
      (response && response.message && response.message.content) ||
      'Something went wrong. Try again.';
  } catch (err) {
    aiText = 'Something went wrong. Try again.\n\nError: ' + (err && err.message ? err.message : String(err));
  }

  if (thinkingMsg && thinkingMsg.parentNode) {
    thinkingMsg.parentNode.removeChild(thinkingMsg);
  }

  addMessage('ai', aiText);
  chatState.history.push({ role: 'assistant', content: aiText });

  chatState.isSending = false;
  if (sendBtn) sendBtn.disabled = false;
}

/* -----------------------------------------
   handleKeydown — Enter to send, Shift+Enter newline
   ----------------------------------------- */
function handleKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

/* -----------------------------------------
   initChat — initialize a standard chat page
   ----------------------------------------- */
function initChat(config) {
  chatState.config = config;
  chatState.systemPrompt = config.systemPrompt;
  chatState.history = [];

  const quickPromptsContainer = document.getElementById('quickPrompts');
  if (quickPromptsContainer && config.quickPrompts) {
    config.quickPrompts.forEach(function (prompt) {
      const chip = document.createElement('button');
      chip.className = 'chip';
      chip.textContent = prompt;
      chip.addEventListener('click', function () {
        const textarea = document.getElementById('messageInput');
        if (textarea) {
          textarea.value = prompt;
          autoResize(textarea);
          textarea.focus();
        }
        sendMessage();
      });
      quickPromptsContainer.appendChild(chip);
    });
  }

  const textarea = document.getElementById('messageInput');
  if (textarea) {
    textarea.addEventListener('input', function () { autoResize(textarea); });
    textarea.addEventListener('keydown', handleKeydown);
  }

  const sendBtn = document.getElementById('sendBtn');
  if (sendBtn) {
    sendBtn.addEventListener('click', sendMessage);
  }

  const clearBtn = document.getElementById('clearBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearChat);
  }
}

/* ============================================
   ALL ROUNDER — SMART ROUTING & API FUNCTIONS
   ============================================ */

/* -----------------------------------------
   Country name list for detection
   ----------------------------------------- */
var COUNTRY_NAMES = [
  'india','usa','united states','uk','united kingdom','canada','australia',
  'germany','france','japan','china','brazil','russia','italy','spain',
  'mexico','south korea','netherlands','switzerland','sweden','norway',
  'denmark','finland','ireland','portugal','poland','austria','belgium',
  'new zealand','singapore','malaysia','thailand','vietnam','indonesia',
  'philippines','uae','saudi arabia','turkey','egypt','south africa',
  'nigeria','kenya','argentina','colombia','chile','peru','israel',
  'greece','czech republic','romania','hungary','ukraine','bangladesh',
  'pakistan','srilanka','nepal','myanmar','cambodia','laos','mongolia',
  'kazakhstan','iran','iraq','afghanistan','syria','jordan','lebanon',
  'cuba','jamaica','ghana','tanzania','ethiopia','morocco','tunisia',
  'algeria','libya','sudan','uganda','zimbabwe','mozambique','madagascar',
  'croatia','serbia','slovakia','slovenia','bulgaria','lithuania','latvia',
  'estonia','iceland','luxembourg','malta','cyprus'
];

function isCountryName(msg) {
  var m = msg.toLowerCase();
  return COUNTRY_NAMES.some(function (c) { return m.includes(c); });
}

/* -----------------------------------------
   detectIntent — classify user message
   ----------------------------------------- */
function detectIntent(message) {
  var m = message.toLowerCase();

  if (m.includes('weather') || m.includes('temperature') ||
      m.includes('forecast') || m.includes('humidity') ||
      m.includes('rain') || m.includes('climate'))
    return 'weather';

  if (m.includes('news') || m.includes('headline') ||
      (m.includes('today') && m.includes('latest')) ||
      m.includes('current events') || m.includes('breaking'))
    return 'news';

  if (m.includes('define') || m.includes('definition') ||
      m.includes('meaning of') ||
      (m.includes('what does') && m.includes('mean')) ||
      m.includes('dictionary'))
    return 'dictionary';

  if (m.includes('currency') ||
      (m.includes(' to ') &&
        (m.includes('usd') || m.includes('inr') ||
         m.includes('eur') || m.includes('gbp') ||
         m.includes('convert'))) ||
      m.includes('exchange rate'))
    return 'currency';

  if (m.includes('country') || m.includes('capital of') ||
      m.includes('population of') ||
      (m.includes('tell me about') &&
        (m.includes('country') || isCountryName(m))))
    return 'country';

  if (m.includes('nasa') || m.includes('space') ||
      m.includes('planet') || m.includes('astronomy') ||
      m.includes('photo of the day') || m.includes('apod') ||
      m.includes('universe') || m.includes('galaxy'))
    return 'nasa';

  if (m.includes('book') || m.includes('novel') ||
      m.includes('author') || m.includes('written by') ||
      m.includes('find book'))
    return 'books';

  if ((m.includes('fact about') && /\d/.test(m)) ||
      m.includes('number fact') || m.includes('trivia about'))
    return 'numbers';

  if (m.includes('quote') || m.includes('inspire me') ||
      m.includes('motivation') || m.includes('wise words'))
    return 'quote';

  if (m.includes('joke') || m.includes('funny') ||
      m.includes('make me laugh') || m.includes('tell me a joke'))
    return 'joke';

  return 'ai';
}

/* -----------------------------------------
   API FETCH FUNCTIONS
   ----------------------------------------- */
async function fetchWeather(message) {
  var words = message.toLowerCase().split(' ');
  var prepositions = ['in', 'for', 'at', 'of'];
  var city = 'Delhi';
  for (var i = 0; i < words.length; i++) {
    if (prepositions.indexOf(words[i]) !== -1 && words[i + 1]) {
      city = words[i + 1].charAt(0).toUpperCase() + words[i + 1].slice(1);
      break;
    }
  }
  var url = 'https://api.openweathermap.org/data/2.5/weather?q=' +
    encodeURIComponent(city) + '&appid=' + KNOW_KEYS.weather + '&units=metric';
  var res = await fetch(url);
  var data = await res.json();
  if (data.cod !== 200) return null;
  return {
    city: data.name,
    country: data.sys.country,
    temp: Math.round(data.main.temp),
    feels: Math.round(data.main.feels_like),
    condition: data.weather[0].description,
    humidity: data.main.humidity,
    wind: data.wind.speed
  };
}

async function fetchNews(message) {
  var stopwords = ['news', 'latest', 'today', 'about',
    'headlines', 'show', 'get', 'give', 'tell', 'me', 'the'];
  var words = message.toLowerCase()
    .replace(/[^a-z\s]/g, '').split(' ')
    .filter(function (w) { return w && stopwords.indexOf(w) === -1; });
  var query = words.join(' ') || 'technology';
  var url = 'https://gnews.io/api/v4/search?q=' +
    encodeURIComponent(query) + '&lang=en&max=4&apikey=' + KNOW_KEYS.news;
  var res = await fetch(url);
  var data = await res.json();
  return data.articles || [];
}

async function fetchNASA() {
  var url = 'https://api.nasa.gov/planetary/apod?api_key=' + KNOW_KEYS.nasa;
  var res = await fetch(url);
  return await res.json();
}

async function fetchDictionary(message) {
  var words = message.toLowerCase()
    .replace(/define|definition|meaning of|what does|mean|dictionary|the|a|an/g, '').trim().split(' ');
  var word = '';
  for (var i = 0; i < words.length; i++) {
    if (words[i].length > 2) { word = words[i]; break; }
  }
  if (!word) word = words[0] || '';
  var url = 'https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(word);
  var res = await fetch(url);
  if (!res.ok) return null;
  var data = await res.json();
  return { word: word, data: data[0] };
}

async function fetchCurrency(message) {
  var m = message.toUpperCase();
  var currencies = ['USD', 'INR', 'EUR', 'GBP', 'JPY',
    'AED', 'CAD', 'AUD', 'SGD', 'CHF'];
  var found = currencies.filter(function (c) { return m.includes(c); });
  var base = found[0] || 'USD';
  var url = 'https://api.frankfurter.app/latest?from=' + base;
  var res = await fetch(url);
  return await res.json();
}

async function fetchCountry(message) {
  var stopwords = ['tell', 'me', 'about', 'country', 'the',
    'information', 'info', 'what', 'is', 'capital', 'of', 'population'];
  var words = message.toLowerCase().split(' ')
    .filter(function (w) { return w && stopwords.indexOf(w) === -1; });
  var name = words.join('%20') || 'india';
  var url = 'https://restcountries.com/v3.1/name/' + name + '?fullText=false';
  var res = await fetch(url);
  if (!res.ok) return null;
  var data = await res.json();
  return data[0];
}

async function fetchQuote() {
  var res = await fetch('https://api.quotable.io/random');
  return await res.json();
}

async function fetchJoke() {
  var res = await fetch(
    'https://v2.jokeapi.dev/joke/Any?blacklistFlags=nsfw,racist,sexist&type=single');
  return await res.json();
}

async function fetchNumberFact(message) {
  var match = message.match(/\d+/);
  var num = match ? match[0] : Math.floor(Math.random() * 100).toString();
  var res = await fetch('https://numbersapi.com/' + num + '/trivia?json');
  return await res.json();
}

/* -----------------------------------------
   RESPONSE RENDERER FUNCTIONS
   ----------------------------------------- */
function renderWeather(data) {
  return '<strong>' + escapeHtml(data.city) + ', ' + escapeHtml(data.country) + '</strong><br><br>' +
    'Temperature: ' + data.temp + '°C (feels like ' + data.feels + '°C)<br>' +
    'Condition: ' + escapeHtml(data.condition) + '<br>' +
    'Humidity: ' + data.humidity + '%<br>' +
    'Wind: ' + data.wind + ' m/s';
}

function renderNews(articles) {
  if (!articles || !articles.length)
    return 'No news found for that topic right now.';
  return articles.map(function (a, i) {
    return '<strong>' + (i + 1) + '. ' + escapeHtml(a.title) + '</strong><br>' +
      '<span style="color:#999;font-size:12px">' +
      escapeHtml(a.source.name) + ' — ' +
      new Date(a.publishedAt).toLocaleDateString() +
      '</span><br><br>';
  }).join('');
}

function renderNASA(data) {
  return '<strong>NASA \u2014 Astronomy Picture of the Day</strong><br><br>' +
    '<strong>' + escapeHtml(data.title) + '</strong><br><br>' +
    escapeHtml(data.explanation.substring(0, 300)) + '...<br><br>' +
    '<a href="' + data.url + '" target="_blank" style="color:#0a0a0a">View Image \u2192</a>';
}

function renderDictionary(result) {
  if (!result) return 'Word not found in dictionary.';
  var entry = result.data;
  var meaning = entry.meanings[0];
  var def = meaning.definitions[0];
  var html = '<strong>' + escapeHtml(result.word) + '</strong> ' +
    '<em style="color:#999">' + escapeHtml(meaning.partOfSpeech) + '</em><br><br>' +
    escapeHtml(def.definition);
  if (def.example) {
    html += '<br><br><em style="color:#999">"' + escapeHtml(def.example) + '"</em>';
  }
  return html;
}

function renderCurrency(data) {
  var pairs = ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'AED'];
  var rates = pairs
    .filter(function (c) { return c !== data.base && data.rates[c]; })
    .map(function (c) { return c + ': ' + data.rates[c].toFixed(2); });
  return '<strong>1 ' + escapeHtml(data.base) + ' =</strong><br><br>' +
    rates.join('<br>') +
    '<br><br><span style="color:#999;font-size:12px">Live rates via Frankfurter API</span>';
}

function renderCountry(data) {
  if (!data) return 'Country not found.';
  var capital = (data.capital && data.capital[0]) ? data.capital[0] : 'N/A';
  var currencyStr = '';
  if (data.currencies) {
    currencyStr = Object.values(data.currencies).map(function (c) {
      return c.name + ' (' + c.symbol + ')';
    }).join(', ');
  }
  var languagesStr = '';
  if (data.languages) {
    languagesStr = Object.values(data.languages).join(', ');
  }
  var dialCode = '';
  if (data.idd && data.idd.root) {
    dialCode = '+' + data.idd.root.replace('+', '') +
      (data.idd.suffixes && data.idd.suffixes[0] ? data.idd.suffixes[0] : '');
  }
  return '<strong>' + escapeHtml(data.name.common) + '</strong> (' + escapeHtml(data.name.official) + ')<br><br>' +
    'Region: ' + escapeHtml(data.region) + ', ' + escapeHtml(data.subregion) + '<br>' +
    'Capital: ' + escapeHtml(capital) + '<br>' +
    'Population: ' + data.population.toLocaleString() + '<br>' +
    'Currency: ' + escapeHtml(currencyStr) + '<br>' +
    'Languages: ' + escapeHtml(languagesStr) + '<br>' +
    'Dial code: ' + escapeHtml(dialCode);
}

/* -----------------------------------------
   sendMessageAllRounder — main send for All Rounder page
   ----------------------------------------- */
async function sendMessageAllRounder() {
  if (chatState.isSending) return;

  var input = document.getElementById('messageInput');
  if (!input) return;
  var message = input.value.trim();
  if (!message) return;

  hideEmptyState();
  addMessage('user', message);
  input.value = '';
  autoResize(input);

  chatState.isSending = true;
  var sendBtn = document.getElementById('sendBtn');
  if (sendBtn) sendBtn.disabled = true;

  var thinkingId = addMessage('thinking', 'Thinking...');
  var intent = detectIntent(message);
  var responseText = '';

  try {
    if (intent === 'weather') {
      var data = await fetchWeather(message);
      if (data) responseText = renderWeather(data);
      else responseText = 'Could not get weather for that location. Try being more specific.';

    } else if (intent === 'news') {
      var articles = await fetchNews(message);
      responseText = renderNews(articles);

    } else if (intent === 'nasa') {
      var nasaData = await fetchNASA();
      responseText = renderNASA(nasaData);

    } else if (intent === 'dictionary') {
      var dictResult = await fetchDictionary(message);
      responseText = renderDictionary(dictResult);

    } else if (intent === 'currency') {
      var currData = await fetchCurrency(message);
      responseText = renderCurrency(currData);

    } else if (intent === 'country') {
      var countryData = await fetchCountry(message);
      responseText = renderCountry(countryData);

    } else if (intent === 'quote') {
      var quoteData = await fetchQuote();
      responseText = '"' + escapeHtml(quoteData.content) + '"<br><br>\u2014 ' + escapeHtml(quoteData.author);

    } else if (intent === 'joke') {
      var jokeData = await fetchJoke();
      responseText = jokeData.joke || 'Could not load a joke right now.';

    } else if (intent === 'numbers') {
      var numData = await fetchNumberFact(message);
      responseText = numData.text || 'Could not find a fact for that number.';

    } else {
      // Default: pure AI via Puter.js
      var systemPrompt =
        'Your name is KnoW. You are KnoW \u2014 a smart, all-purpose AI assistant. ' +
        'You are NOT ChatGPT. If asked your name or identity always say "I am KnoW." ' +
        'Help with any task: answer questions, explain topics, do calculations, ' +
        'write content, give advice. Be concise and direct.';

      var messages;
      if (chatState.history.length === 0) {
        messages = [{ role: 'user', content: systemPrompt + '\n\n' + message }];
      } else {
        messages = chatState.history.concat([{ role: 'user', content: message }]);
      }

      var response = await puter.ai.chat(messages);
      responseText =
        (response && response.message && response.message.content &&
         response.message.content[0] && response.message.content[0].text) ||
        (typeof response === 'string' ? response : '') ||
        'Something went wrong. Try again.';
    }
  } catch (err) {
    responseText = 'Something went wrong. Try again.\n\nError: ' + (err && err.message ? err.message : String(err));
  }

  // Remove thinking indicator
  if (thinkingId && thinkingId.parentNode) {
    thinkingId.parentNode.removeChild(thinkingId);
  }

  // Render response
  addMessageHTML('ai', responseText);

  // Update history
  chatState.history.push({ role: 'user', content: message });
  chatState.history.push({ role: 'assistant', content: responseText });

  chatState.isSending = false;
  if (sendBtn) sendBtn.disabled = false;
}

/* -----------------------------------------
   handleKeydownAllRounder — Enter to send for All Rounder
   ----------------------------------------- */
function handleKeydownAllRounder(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessageAllRounder();
  }
}

/* -----------------------------------------
   initAllRounderChat — initialize the All Rounder chat page
   ----------------------------------------- */
function initAllRounderChat(config) {
  chatState.config = config;
  chatState.systemPrompt = config.systemPrompt;
  chatState.history = [];

  // Render quick prompt chips
  var quickPromptsContainer = document.getElementById('quickPrompts');
  if (quickPromptsContainer && config.quickPrompts) {
    config.quickPrompts.forEach(function (prompt) {
      var chip = document.createElement('button');
      chip.className = 'chip';
      chip.textContent = prompt;
      chip.addEventListener('click', function () {
        var textarea = document.getElementById('messageInput');
        if (textarea) {
          textarea.value = prompt;
          autoResize(textarea);
          textarea.focus();
        }
        sendMessageAllRounder();
      });
      quickPromptsContainer.appendChild(chip);
    });
  }

  // Wire up textarea
  var textarea = document.getElementById('messageInput');
  if (textarea) {
    textarea.addEventListener('input', function () { autoResize(textarea); });
    textarea.addEventListener('keydown', handleKeydownAllRounder);
  }

  // Wire up send button
  var sendBtn = document.getElementById('sendBtn');
  if (sendBtn) {
    sendBtn.addEventListener('click', sendMessageAllRounder);
  }

  // Wire up clear button
  var clearBtn = document.getElementById('clearBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearChat);
  }
}

/* -----------------------------------------
   On DOM ready — initialize mobile menu + Firebase auth
   ----------------------------------------- */
document.addEventListener('DOMContentLoaded', function () {
  initMobileMenu();
  initFirebaseAuth();
});
