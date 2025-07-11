import { GameManager } from "./managers/gameManager";

function showInitModal() {
  const modal = document.createElement("div");
  modal.id = "modal";
  const title = document.createElement("h1");
  title.innerText = "Welcome on my game !";
  const p = document.createElement("p");
  p.innerHTML = `Hello, <br /><br />

    This is a project I completed as part of my studies. It's a Mario emulator built entirely with
    TypeScript and <span class="span-red">without using any canvas</span> (┳Д┳).<br /><br />

    The interface was designed with a desktop-first approach, but it's still
    <span class="span-green">fully playable on mobile.</span><br /><br />

    Note: Sometimes the <span class="span-red">loading might fail</span> at the start of the game — if
    that happens, feel free to <span class="span-green">restart the game.</span>`;
  const button = document.createElement("button");
  button.className = "modalButton";
  button.innerText = "Start";
  button.addEventListener("click", () => {
    GameManager.getInstance().init();
  });
  modal.appendChild(title);
  modal.appendChild(p);
  modal.appendChild(button);
  document.body.appendChild(modal);
}

showInitModal();
