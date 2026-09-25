import "@fontsource/barlow-condensed/latin-600.css";
import "@fontsource/barlow-condensed/latin-800.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import "./style.css";

function showError() {
  if (document.getElementById("fatal-error")) return;
  const panel = document.createElement("section");
  panel.id = "fatal-error";
  panel.innerHTML =
    "<h2>UNABLE TO START THE COMPOUND</h2><p>This game needs WebGL graphics. Enable hardware acceleration in your browser, then reload. If you are in an embedded preview, try opening the game in a new tab.</p><button>RELOAD GAME</button>";
  panel.querySelector("button").onclick = () => location.reload();
  document.body.append(panel);
}
document
  .getElementById("game")
  .addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    showError();
  });
import("./main.js").catch((error) => {
  console.error("Game initialization failed:", error);
  showError();
});
