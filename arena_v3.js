// arena_v3.js — CryptoYogi Arena v3.1 (drop-in temel)
// Not: HTML’deki id’lere birebir bağlanır. Ek bağımlılık yok.
// Wallet/NFT entegrasyonu için aşağıdaki HOOK bölümüne bağlayacağız.

(() => {
  // ---------- KISA YARDIMCILAR ----------
  const $  = (id) => document.getElementById(id);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function setMessage(t) {
    const el = $("game-messages");
    if (el) el.textContent = t;
  }

  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

  // ---------- GLOBAL STATE ----------
  const state = {
    turn: "player", // "player" | "opponent"
    player1: { name: "SEN", hp: 100, level: 1, atk: 10, def: 5, crit: 10, img: "", items: [] },
    player2: { name: "RAKİP", hp: 100, level: 1, atk: 9,  def: 6, crit: 8,  img: "", items: [] },
    selectedCharacter: null,
  };

  // ---------- UI: PARÇACIKLAR (arka plan yıldızlar) ----------
  function initParticles() {
    const wrap = document.querySelector(".particles");
    if (!wrap) return;
    // mobilde hafif tut
    const count = Math.min(80, Math.floor(window.innerWidth / 12));
    for (let i = 0; i < count; i++) {
      const p = document.createElement("div");
      p.className = "particle";
      p.style.left = Math.random() * 100 + "%";
      p.style.top  = Math.random() * 100 + "%";
      p.style.animationDuration = (1.6 + Math.random() * 2.2) + "s";
      p.style.opacity = (0.3 + Math.random() * 0.7).toString();
      wrap.appendChild(p);
    }
  }

  // ---------- UI: SIRA PARILTISI ----------
  function setTurnGlow(turn) {
    $("player1-bar")?.classList.toggle("player-turn-glow-player", turn === "player");
    $("player2-area")?.classList.toggle("player-turn-glow-opponent", turn === "opponent");
  }

  // ---------- UI: OYUNCU 1 (üst bar) ----------
  function setPlayer1UI(p) {
    if (p.img) $("player1-avatar").src = p.img;
    $("player1-name-bar").textContent  = p.name ?? "SEN";
    $("player1-level-bar").textContent = p.level ?? "?";
    $("player1-atk-bar").textContent   = p.atk ?? "?";
    $("player1-def-bar").textContent   = p.def ?? "?";
    $("player1-crit-bar").textContent  = p.crit ?? "?";

    const hpPct = clamp(p.hp, 0, 100);
    $("player1-hp-bar-small").style.width = `${hpPct}%`;
    $("player1-hp-bar-text").textContent  = hpPct;
    $("player1-hp-bar-small").classList.toggle("low-hp", hpPct <= 30);
  }

  // ---------- UI: RAKİP BLOĞU ----------
  function setOpponentUI(o) {
    $("player2-name-display").textContent = o.name ?? "RAKİP";

    const hpPct = clamp(o.hp, 0, 100);
    $("player2-hp-bar").style.width = `${hpPct}%`;
    $("player2-hp").textContent = hpPct;
    $("player2-hp-bar").classList.toggle("low-hp", hpPct <= 30);

    // Kart görseli
    const v = $("player2-character-card-visual");
    v.innerHTML = "";
    if (o.img) {
      const img = document.createElement("img");
      img.src = o.img; img.alt = o.name || "opponent";
      v.appendChild(img);
    }

    $("player2-character-name").textContent = o.name ?? "Rakip";
    $("player2-character-stats").innerHTML = `
      <div class="character-stat-item">LVL: <span class="character-stat-value">${o.level ?? "?"}</span></div>
      <div class="character-stat-item">ATK: <span class="character-stat-value">${o.atk ?? "?"}</span></div>
      <div class="character-stat-item">DEF: <span class="character-stat-value">${o.def ?? "?"}</span></div>
      <div class="character-stat-item">CRIT: <span class="character-stat-value">${o.crit ?? "?"}%</span></div>
    `;
  }

  function setPlayer1Items(items = []) {
    const wrap = $("player1-items-bar");
    if (!wrap) return;
    wrap.innerHTML = "";
    items.forEach(it => {
      const d = document.createElement("div");
      d.className = "player-bar-item-icon";
      d.textContent = it.icon || "⚡";
      d.title = it.name || "";
      wrap.appendChild(d);
    });
  }

  // ---------- MEKANİK ----------
  function attack(attacker, defender, opts = { animateTargetId: "player2-character-card-visual" }) {
    // basit crit
    const roll  = Math.random() * 100;
    const isCrit = roll < (attacker.crit || 0);
    const base = Math.max(1, (attacker.atk || 1) - Math.floor((defender.def || 0) / 2));
    const dmg  = Math.round(base * (isCrit ? 1.8 : 1.0));

    defender.hp = clamp((defender.hp || 100) - dmg, 0, 100);

    // animasyon
    const targetCard = $(opts.animateTargetId);
    if (targetCard) {
      targetCard.classList.add("hit");
      setTimeout(() => targetCard.classList.remove("hit"), 420);
    }

    setMessage(`${attacker === state.player1 ? "Sen" : "Rakip"} ${isCrit ? "KRİTİK " : ""}${dmg} hasar verdi.`);
  }

  function finish(text) {
    setMessage(text);
    // Butonları kilitle
    ["attack-button", "buff-button"].forEach(id => $(id)?.classList.add("disabled"));
    // Kazanan karta ufak animasyon
    if (text.includes("Sen kazandın")) {
      $("intro-player-card")?.classList.add("winner-animation");
    } else {
      $("player2-character-card-visual")?.classList.add("winner-animation");
    }
  }

  function refreshUI() {
    setPlayer1UI(state.player1);
    setOpponentUI(state.player2);
    if (state.player1.hp === 0) return finish("Rakip kazandı!");
    if (state.player2.hp === 0) return finish("Sen kazandın!");
  }

  function endTurn() {
    state.turn = state.turn === "player" ? "opponent" : "player";
    setTurnGlow(state.turn);
    refreshUI();
    if (state.turn === "opponent") {
      setTimeout(opponentAI, 700);
    }
  }

  function opponentAI() {
    // çok basit yapay zeka: sadece saldır
    attack(state.player2, state.player1, { animateTargetId: "intro-player-card" });
    if (state.player1.hp === 0) return finish("Rakip kazandı!");
    endTurn();
  }

  // ---------- SAVAŞI BAŞLAT KÖPRÜSÜ ----------
  function onCharacterSelected({ name, img, level, atk, def, crit, items = [] }) {
    state.player1 = { name, img, level, atk, def, crit, hp: 100, items };
    // Rakip: basit örnek (ileride AI/rarity’ye bağlayacağız)
    state.player2 = randomOpponent();

    // Player bar + intro kart
    setPlayer1UI(state.player1);
    setPlayer1Items(items);

    const intro = $("intro-player-card");
    intro.innerHTML = "";
    if (img) {
      const im = document.createElement("img");
      im.src = img; im.alt = name;
      intro.appendChild(im);
    }
    $("intro-player-name").textContent = name;

    // Ekran geçişi
    $("character-selection-screen").style.display = "none";
    $("game-container").style.display = "flex";

    // Kısa intro animasyonu
    const introScreen = $("battle-intro-screen");
    introScreen.style.opacity = 1;
    introScreen.style.pointerEvents = "auto";
    setTimeout(() => {
      intro.style.opacity = 1;
      intro.style.transform = "scale(1.0)";
      $("intro-player-name").style.opacity = 1;

      setTimeout(() => {
        introScreen.style.opacity = 0;
        introScreen.style.pointerEvents = "none";
        wireButtons();
        setTurnGlow("player");
        refreshUI();
        setMessage("SAVAŞ BAŞLADI! SIRA SENDE.");
      }, 900);
    }, 50);
  }

  // ---------- BUTTON WIRING ----------
  function wireButtons() {
    const atkBtn  = $("attack-button");
    const buffBtn = $("buff-button");
    const rstBtn  = $("restart-button");

    // Butonları göster
    atkBtn?.classList.remove("hidden", "disabled");
    buffBtn?.classList.remove("hidden", "disabled");
    rstBtn?.classList.remove("hidden");

    atkBtn.onclick = () => {
      if (state.turn !== "player" || atkBtn.classList.contains("disabled")) return;
      attack(state.player1, state.player2);
      if (state.player2.hp === 0) return finish("Sen kazandın!");
      endTurn();
    };

    buffBtn.onclick = async () => {
      if (state.turn !== "player" || buffBtn.classList.contains("disabled")) return;
      // Mini buff: 1 tur +5 ATK
      state.player1.atk += 5;
      setMessage("GÜÇLENDİN! (+5 ATK, 1 tur)");
      $("intro-player-card")?.classList.add("buffed-animation");
      setTimeout(() => $("intro-player-card")?.classList.remove("buffed-animation"), 1500);
      endTurn();
      // Tur sonunda geri al
      setTimeout(() => {
        state.player1.atk -= 5;
        refreshUI();
      }, 1200);
    };

    rstBtn.onclick = () => {
      // Basit reset
      state.player1.hp = 100; state.player2.hp = 100;
      state.turn = "player";
      ["attack-button", "buff-button"].forEach(id => $(id)?.classList.remove("disabled"));
      setTurnGlow("player");
      refreshUI();
      setMessage("Yeniden başlatıldı. Sıra sende.");
    };
  }

  // ---------- KARAKTER SEÇİM EKRANI ----------
  // Dummy NFT’ler (entegrasyon gelene kadar)
  const DUMMY_CHARACTERS = [
    { name: "Master Yogi",  img: "https://placehold.co/300x400/8000ff/ffffff?text=Master+Yogi",  level: 5, atk: 14, def: 9,  crit: 18, items: [{icon:"⚡", name:"Volt Core"}] },
    { name: "Oracle Nova",  img: "https://placehold.co/300x400/00ffff/000000?text=Oracle+Nova",  level: 4, atk: 12, def: 8,  crit: 20, items: [{icon:"🛡️", name:"Phase Shield"}] },
    { name: "Monk Vortex",  img: "https://placehold.co/300x400/ff0080/ffffff?text=Monk+Vortex",  level: 3, atk: 11, def: 7,  crit: 12, items: [{icon:"💊", name:"Nano Stim"}] },
  ];

  function populateCharacterGrid(characters) {
    const grid = $("character-grid");
    const loading = $("loading-nfts");
    if (!grid) return;

    if (loading) loading.remove();
    grid.innerHTML = "";

    characters.forEach((c, idx) => {
      const card = document.createElement("div");
      card.className = "character-selection-card";
      card.dataset.index = idx.toString();
      card.innerHTML = `
        <img src="${c.img}" alt="${c.name}">
        <h3>${c.name}</h3>
        <p>LVL ${c.level} • ATK ${c.atk} • DEF ${c.def} • CRIT ${c.crit}%</p>
      `;
      card.addEventListener("click", () => {
        $$(".character-selection-card").forEach(el => el.classList.remove("selected"));
        card.classList.add("selected");
        state.selectedCharacter = c;
        // SAVAŞA BAŞLA butonunu aç
        const btn = $("select-character-button");
        btn.classList.remove("disabled");
        btn.disabled = false;
      });
      grid.appendChild(card);
    });
  }

  function wireSelectionStart() {
    const btn = $("select-character-button");
    if (!btn) return;
    btn.addEventListener("click", () => {
      if (!state.selectedCharacter) return;
      onCharacterSelected(state.selectedCharacter);
    });
  }

  function showWalletAddress() {
    const el = $("displayWalletAddress");
    if (!el) return;
    // Query paramdan okumayı dener (?wallet=...),
    // yoksa placeholder basar.
    const url = new URL(window.location.href);
    const w = url.searchParams.get("wallet");
    el.textContent = w || "0:YOUR_WALLET_ADDRESS";
  }

  // ---------- RAKİP ÜRETİMİ (basit) ----------
  function randomOpponent() {
    // Player’dan farklı bir dummy seçelim
    const pool = DUMMY_CHARACTERS;
    const cand = pool[Math.floor(Math.random() * pool.length)];
    // Player ile aynıysa farklı bir tane daha çek
    if (state.selectedCharacter && cand.name === state.selectedCharacter.name) {
      const others = pool.filter(x => x.name !== cand.name);
      return { ...(others[0] || cand), hp: 100, name: "RAKİP " + (others[0]?.name || cand.name) };
    }
    return { ...cand, hp: 100, name: "RAKİP " + cand.name };
  }

  // ---------- HOOK: DIŞ ENTEGRASYON (NFT/WALLET) ----------
  // İleride dışarıdan NFT verisi geldiğinde bunu çağıracağız:
  // window.CY_setCharacters(charArray)
  // window.CY_setWallet(addr)
  window.CY_setCharacters = (arr) => {
    if (!Array.isArray(arr) || !arr.length) return;
    populateCharacterGrid(arr);
  };
  window.CY_setWallet = (addr) => {
    const el = $("displayWalletAddress");
    if (el) el.textContent = addr || el.textContent;
  };

  // ---------- INIT ----------
  document.addEventListener("DOMContentLoaded", () => {
    initParticles();
    showWalletAddress();
    populateCharacterGrid(DUMMY_CHARACTERS);
    wireSelectionStart();
    // Oyun ekranı başlangıçta gizlenmiş, seçimden sonra açılacak.
    // Butonlara basana kadar ses vb. kullanıcı etkileşimi gerektiren şey yok.
  });
})();
