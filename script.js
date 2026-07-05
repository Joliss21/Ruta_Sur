const chatWidget = document.querySelector("#chat-widget");
const chatMessages = document.querySelector("#chat-messages");
const chatForm = document.querySelector("#chat-form");
const chatInput = document.querySelector("#chat-input");
const chatClose = document.querySelector(".chat-close");
const openChatButtons = document.querySelectorAll(".open-chat");
const navToggle = document.querySelector(".nav-toggle");
const navMenu = document.querySelector("#nav-menu");

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
}

openChatButtons.forEach((button) => {
  button.addEventListener("click", openChat);
});

chatClose.addEventListener("click", closeChat);

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const text = chatInput.value.trim();
  if (!text) {
    return;
  }

  appendMessage(text, "user");
  chatInput.value = "";

  window.setTimeout(() => {
    appendMessage(
      "Gracias por tu consulta. En la proxima version conectare este chat al agente de RutaSur en n8n.",
      "assistant"
    );
  }, 450);
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
