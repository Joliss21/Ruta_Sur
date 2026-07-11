const N8N_WEBHOOK_URL = "PEGAR_AQUI_URL_WEBHOOK";
const SESSION_STORAGE_KEY = "rutasur_session_id";

let sessionId = localStorage.getItem(SESSION_STORAGE_KEY);

if (!sessionId) {
  sessionId = crypto.randomUUID();
  localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
}

const chatWidget = document.querySelector("#chat-widget");
const chatMessages = document.querySelector("#chat-messages");
const chatForm = document.querySelector("#chat-form");
const chatInput = document.querySelector("#chat-input");
const chatSubmitButton = chatForm.querySelector('button[type="submit"]');
const chatClose = document.querySelector(".chat-close");
const openChatButtons = document.querySelectorAll(".open-chat");
const navToggle = document.querySelector(".nav-toggle");
const navMenu = document.querySelector("#nav-menu");
let isSendingMessage = false;

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

function appendMessage(text, type) {
  const message = document.createElement("p");
  message.className = `message ${type}`;
  message.textContent = text;
  chatMessages.appendChild(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return message;
}

openChatButtons.forEach((button) => {
  button.addEventListener("click", openChat);
});

chatClose.addEventListener("click", closeChat);

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (isSendingMessage) {
    return;
  }

  const text = chatInput.value.trim();
  if (!text) {
    return;
  }

  isSendingMessage = true;
  appendMessage(text, "user");
  chatInput.value = "";
  chatSubmitButton.disabled = true;
  const waitingMessage = appendMessage("RutaSur está escribiendo…", "assistant");
  const requestController = new AbortController();
  const requestTimeout = window.setTimeout(() => requestController.abort(), 30000);

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
    const respuesta =
      data.respuesta ||
      data.output ||
      data.message ||
      "No fue posible obtener una respuesta del asistente.";

    waitingMessage.remove();
    appendMessage(respuesta, "assistant");
  } catch (error) {
    waitingMessage.remove();
    appendMessage(
      "No pude conectarme con el asistente de RutaSur. Intenta nuevamente en unos momentos.",
      "assistant"
    );
    console.error("Error al conectar con el webhook de n8n:", error);
  } finally {
    window.clearTimeout(requestTimeout);
    isSendingMessage = false;
    chatSubmitButton.disabled = false;
    chatInput.focus();
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
