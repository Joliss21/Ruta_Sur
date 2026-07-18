const N8N_WEBHOOK_URL = "https://n8n.claria.cl/webhook/rutasur-chat";
const SESSION_STORAGE_KEY = "rutasur_session_id";

let sessionId = localStorage.getItem(SESSION_STORAGE_KEY);

if (!sessionId) {
  sessionId = crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
}

const chatWidget = document.querySelector("#chat-widget");
const chatMessages = document.querySelector("#chat-messages");
const chatForm = document.querySelector("#chat-form");
const chatInput = document.querySelector("#chat-input");
const chatClose = document.querySelector(".chat-close");
const openChatButtons = document.querySelectorAll(".open-chat");
const navToggle = document.querySelector(".nav-toggle");
const navMenu = document.querySelector("#nav-menu");
let waitingMessage = null;
let pendingRequestCount = 0;
let latestRequestId = 0;
let errorShownForCurrentBatch = false;

function openChat(event) {
  const suggestion = event?.currentTarget?.dataset?.chatSuggestion;
  openChatWithSuggestion(suggestion);
}

function openChatWithSuggestion(suggestion) {
  chatWidget.classList.add("is-open");
  chatWidget.setAttribute("aria-hidden", "false");

  if (suggestion) {
    chatInput.value = suggestion;
  }

  chatInput.focus();
}

function closeChat() {
  chatWidget.classList.remove("is-open");
  chatWidget.setAttribute("aria-hidden", "true");
}

function appendLinkedText(container, text) {
  const urlPattern = /https?:\/\/[^\s]+/gi;
  let lastIndex = 0;

  for (const match of text.matchAll(urlPattern)) {
    container.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));

    try {
      const url = new URL(match[0]);

      if (url.protocol === "http:" || url.protocol === "https:") {
        const link = document.createElement("a");
        link.href = match[0];
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = match[0];
        container.appendChild(link);
      } else {
        container.appendChild(document.createTextNode(match[0]));
      }
    } catch {
      container.appendChild(document.createTextNode(match[0]));
    }

    lastIndex = match.index + match[0].length;
  }

  container.appendChild(document.createTextNode(text.slice(lastIndex)));
}

function appendInlineContent(container, text) {
  const boldPattern = /\*\*([^*\n]+)\*\*/g;
  let lastIndex = 0;

  for (const match of text.matchAll(boldPattern)) {
    appendLinkedText(container, text.slice(lastIndex, match.index));

    const strong = document.createElement("strong");
    appendLinkedText(strong, match[1]);
    container.appendChild(strong);
    lastIndex = match.index + match[0].length;
  }

  appendLinkedText(container, text.slice(lastIndex));
}

function renderAssistantContent(container, text) {
  const normalizedText = String(text ?? "")
    .replace(/\\n/g, "\n")
    .replace(/\r\n?/g, "\n")
    .replace(/([^\n])\s+\*\s+(?=\*\*[^*\n]+:\*\*)/g, "$1\n* ")
    .trim();
  const lines = normalizedText.split("\n");
  let paragraphLines = [];
  let activeList = null;

  function flushParagraph() {
    if (paragraphLines.length === 0) {
      return;
    }

    const paragraph = document.createElement("p");

    paragraphLines.forEach((line, index) => {
      if (index > 0) {
        paragraph.appendChild(document.createElement("br"));
      }

      appendInlineContent(paragraph, line);
    });

    container.appendChild(paragraph);
    paragraphLines = [];
  }

  function closeList() {
    activeList = null;
  }

  for (const line of lines) {
    const bulletMatch = line.match(/^\s*[-*•]\s+(.+)$/);
    const numberedMatch = line.match(/^\s*\d+\.\s+(.+)$/);
    const listMatch = bulletMatch || numberedMatch;

    if (listMatch) {
      flushParagraph();
      const listType = bulletMatch ? "ul" : "ol";

      if (!activeList || activeList.tagName.toLowerCase() !== listType) {
        activeList = document.createElement(listType);
        container.appendChild(activeList);
      }

      const item = document.createElement("li");
      appendInlineContent(item, listMatch[1]);
      activeList.appendChild(item);
      continue;
    }

    closeList();

    if (!line.trim()) {
      flushParagraph();
      continue;
    }

    paragraphLines.push(line);
  }

  flushParagraph();
}

function appendMessage(text, type) {
  const shouldFormat = type === "assistant" && text !== "RutaSur está escribiendo…";
  const message = document.createElement(shouldFormat ? "div" : "p");
  message.className = `message ${type}`;

  if (shouldFormat) {
    renderAssistantContent(message, text);
  } else {
    message.textContent = text;
  }

  chatMessages.appendChild(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return message;
}

function showWaitingMessage() {
  if (!waitingMessage) {
    waitingMessage = appendMessage("RutaSur está escribiendo…", "assistant");
  }
}

function removeWaitingMessage() {
  if (waitingMessage) {
    waitingMessage.remove();
    waitingMessage = null;
  }
}

openChatButtons.forEach((button) => {
  button.addEventListener("click", openChat);
});

chatClose.addEventListener("click", closeChat);

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const text = chatInput.value.trim();
  if (!text) {
    return;
  }

  if (pendingRequestCount === 0) {
    errorShownForCurrentBatch = false;
  }

  const requestId = ++latestRequestId;
  pendingRequestCount += 1;
  appendMessage(text, "user");
  chatInput.value = "";
  chatInput.focus();
  showWaitingMessage();

  const requestController = new AbortController();
  const requestTimeout = window.setTimeout(() => requestController.abort(), 60000);

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      signal: requestController.signal,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: text,
        sessionId: sessionId,
      }),
    });

    if (!response.ok) {
      throw new Error(`El webhook respondió con estado ${response.status}`);
    }

    const data = await response.json();
    const responseData = Array.isArray(data) ? data[0] : data;

    if (
      responseData?.mostrar === false ||
      responseData?.tipo_resultado === "mensaje_agrupado"
    ) {
      return;
    }

    const respuesta = [responseData?.respuesta, responseData?.output, responseData?.message].find(
      (value) => typeof value === "string" && value.trim()
    ) || "No fue posible obtener una respuesta del asistente.";

    removeWaitingMessage();
    appendMessage(respuesta, "assistant");
  } catch (error) {
    console.error("Error al conectar con el webhook de n8n:", error);

    if (requestId === latestRequestId && !errorShownForCurrentBatch) {
      errorShownForCurrentBatch = true;
      removeWaitingMessage();
      appendMessage(
        "No pude conectarme con el asistente de RutaSur. Intenta nuevamente en unos momentos.",
        "assistant"
      );
    }
  } finally {
    window.clearTimeout(requestTimeout);
    pendingRequestCount = Math.max(0, pendingRequestCount - 1);

    if (pendingRequestCount === 0) {
      removeWaitingMessage();
    } else {
      showWaitingMessage();
    }
  }
});

navToggle.addEventListener("click", () => {
  const isOpen = navMenu.classList.toggle("is-open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
});

navMenu.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    navMenu.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
  });
});

const urlParams = new URLSearchParams(window.location.search);

if (urlParams.get("chat") === "reserva") {
  openChatWithSuggestion("Hola, quiero consultar por una reserva.");
}

if (urlParams.get("chat") === "seguridad") {
  openChatWithSuggestion("Hola, tengo dudas sobre mi nivel o seguridad para elegir un tour.");
}

if (urlParams.get("chat") === "politicas") {
  openChatWithSuggestion("Hola, quiero iniciar una reserva y validar las condiciones.");
}
