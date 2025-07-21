// Partikül oluşturma fonksiyonu
function createParticles() {
    const particles = document.querySelector('.particles');
    for (let i = 0; i < 100; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 2 + 's';
        particle.style.animationDuration = (Math.random() * 1.5 + 1) + 's';
        particles.appendChild(particle);
    }
}
createParticles(); // Partikülleri başlat

// Webhook URL'si (Make.com entegrasyonu için)
const WEBHOOK_URL = "https://hook.eu2.make.com/5fqovqqnwl1ihdjnqsvywi6y325j7ma5";

// Karakter sınıfı tanımı
class Character {
    constructor(id, name, atk, def, initialHp, imageUrl) {
        this.id = id;
        this.name = name;
        this.baseAtk = atk;
        this.baseDef = def;
        this.currentHp = initialHp;
        this.imageUrl = imageUrl;
        this.buffActive = false; // Buff aktif mi
        this.buffTurnsLeft = 0; // Buff kaç tur sürecek
        this.buffAmount = 15; // Buff ile artan saldırı gücü
        this.criticalChance = 0.2; // Kritik vuruş şansı
        this.criticalMultiplier = 1.5; // Kritik vuruş çarpanı
    }

    // Karakterin görsel HTML'ini döndürür
    toVisualHtml() {
        return `<img src="${this.imageUrl}" alt="${this.name} Image" class="rounded-lg" onerror="this.onerror=null;this.src='https://placehold.co/280x380/6c757d/FFFFFF?text=NFT+ERROR';">`;
    }

    // Karakterin adını döndürür
    toNameHtml() {
        return this.name;
    }

    // Etkili saldırı gücünü hesaplar (buff dahil)
    get effectiveAtk() {
        return this.baseAtk + (this.buffActive ? this.buffAmount : 0);
    }

    // Etkili savunma gücünü döndürür
    get effectiveDef() {
        return this.baseDef;
    }

    // Buff'ı uygular
    applyBuff() {
        this.buffActive = true;
        this.buffTurnsLeft = 2; // 2 tur sürecek
    }

    // Buff süresini azaltır
    decrementBuffTurn() {
        if (this.buffActive) {
            this.buffTurnsLeft--;
            if (this.buffTurnsLeft <= 0) {
                this.buffActive = false;
                this.buffTurnsLeft = 0;
            }
        }
    }

    // Karakterin istatistik HTML'ini döndürür
    toStatsHtml(playerName, playerLevel) {
        let buffStatus = this.buffActive ? `<span class="character-stat-item text-yellow-300">🔥 BUFF: +${this.buffAmount} AP (${this.buffTurnsLeft} tur)</span>` : '';
        return `
            <span class="character-stat-item"><span class="text-cyan-300">👤</span> <span class="character-stat-value">${playerName} (Lv.${playerLevel})</span></span>
            <span class="character-stat-item"><span class="text-red-400">⚔️</span> <span class="character-stat-value">${this.effectiveAtk}</span></span>
            <span class="character-stat-item"><span class="text-green-400">🛡️</span> <span class="character-stat-value">${this.effectiveDef}</span></span>
            <span class="character-stat-item"><span class="text-purple-400">💥</span> <span class="character-stat-value">${(this.criticalChance * 100).toFixed(0)}%</span></span>
            ${buffStatus}
        `;
    }
}

// Oyuncu sınıfı tanımı
class Player {
    constructor(name, initialHp, level = 1, otherInfo = '', isAI = false, characterData) {
        this.name = name;
        this.level = level;
        this.otherInfo = otherInfo;
        this.isAI = isAI;
        this.character = new Character(characterData.id, characterData.name, characterData.atk, characterData.def, initialHp, characterData.imageUrl);
    }
}

// Oyun değişkenleri
const initialPlayerHp = 100;
let player1, player2, currentPlayer, gameActive = false,
    currentTurn = 0,
    turnActionTaken = false,
    currentBattleId = null,
    selectedPlayerNFT = null;
let allFetchedNFTs = [];
let opponentNFTs = [];
let playerWalletAddress = null; // Cüzdan adresini postMessage ile alacağız

// DOM elementleri
const gameContainer = document.getElementById('game-container');
const characterSelectionScreen = document.getElementById('character-selection-screen');
const displayWalletAddress = document.getElementById('displayWalletAddress');
const characterGrid = document.getElementById('character-grid');
const selectCharacterButton = document.getElementById('select-character-button');
const loadingNFTsMessage = document.getElementById('loading-nfts');

const player1Area = document.getElementById('player1-area');
const player1HpBar = document.getElementById('player1-hp-bar');
const player1HpText = document.getElementById('player1-hp');
const player1CharacterCardVisualElement = document.getElementById('player1-character-card-visual');
const player1CharacterNameElement = document.getElementById('player1-character-name');
const player1CharacterStatsElement = document.getElementById('player1-character-stats');
const player1NameDisplay = document.getElementById('player1-name-display');

const player2Area = document.getElementById('player2-area');
const player2HpBar = document.getElementById('player2-hp-bar');
const player2HpText = document.getElementById('player2-hp');
const player2CharacterCardVisualElement = document.getElementById('player2-character-card-visual');
const player2CharacterNameElement = document.getElementById('player2-character-name');
const player2CharacterStatsElement = document.getElementById('player2-character-stats');
const player2NameDisplay = document.getElementById('player2-name-display');

const gameMessagesElement = document.getElementById('game-messages');
const startBattleButton = document.getElementById('start-battle-button');
const restartButton = document.getElementById('restart-button');
const attackButton = document.getElementById('attack-button');
const buffButton = document.getElementById('buff-button');

const battleIntroScreen = document.getElementById('battle-intro-screen');
const introPlayerCard = document.getElementById('intro-player-card');
const introPlayerName = document.getElementById('intro-player-name');
const mainGameContent = document.querySelector('.main-game-content');

// Varsayılan karakter havuzu (Airtable'dan NFT gelmezse kullanılır)
const characterDataPool = [{
    id: 'char001',
    name: 'Alev Lordu',
    atk: 70,
    def: 30,
    imageUrl: "https://cdn.prod.website-files.com/67fb1cd83af51c4fe96dacb2/685da7b3fb481b88dd053d20_ChatGPT%20Image%206%20May%202025%2003_10_16.png"
}, {
    id: 'char002',
    name: 'Şifa Perisi',
    atk: 60,
    def: 40,
    imageUrl: "https://cdn.prod.website-files.com/67fb1cd83af51c4fe96dacb2/685da7b3b67853e49329069b_11%20May%202025%2001_31_54.png"
}, {
    id: 'char003',
    name: 'Cicivo',
    atk: 55,
    def: 45,
    imageUrl: "https://cdn.prod.website-files.com/67fb1cd83af51c4fe96dacb2/685dde0919d13e3af7beb51f_cicivo.png"
}, {
    id: 'char004',
    name: 'Glitchbunny',
    atk: 70,
    def: 30,
    imageUrl: "https://cdn.prod.website-files.com/67fb1cd83af51c4fe96dacb2/685dddfce1c265d546d4de8c_Glitchbunny.png"
}, {
    id: 'char005',
    name: 'Nympho Melis',
    atk: 65,
    def: 35,
    imageUrl: "https://cdn.prod.website-files.com/67fb1cd83af51c4fe96dacb2/685de1b90c3da4ebb26795c5_Nympho%20Melis.png"
}, {
    id: 'char006',
    name: 'Syntax Error',
    atk: 80,
    def: 20,
    imageUrl: "https://cdn.prod.website-files.com/67fb1cd83af51c4fe96dacb2/685dddadecc8300342a11681_syntax_error.png"
}];

// Airtable API bilgileri
const AIRTABLE_API_KEY = 'patNmkPQFkKD7rwMg.ad10006df9da05fea81089b46caab7f1629b474e88b8bf69d91269c58b50e211';
const AIRTABLE_BASE_ID = 'appBuciupEMutB7Z0';
const AIRTABLE_NFT_TABLE_NAME = 'nft_list';
const AIRTABLE_USER_TABLE_NAME = 'user_list';

// Airtable'dan NFT'leri çeken fonksiyon
async function fetchNFTsFromAirtable(walletAddress = null) {
    let url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_NFT_TABLE_NAME}`;
    if (walletAddress) {
        // Cüzdan adresini normalleştir
        const cleanWalletAddress = walletAddress.toLowerCase().trim();
        url += `?filterByFormula={wallet}='${cleanWalletAddress}'`;
    }
    console.log('Airtable API URL (constructed):', url); // Debug: Oluşturulan Airtable URL'ini logla
    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Airtable API hatası: Sunucudan yanıt alınamadı veya yetkilendirme sorunu (HTTP ${response.status}). Lütfen API anahtarınızın, Base ID'nizin ve tablo adınızın doğru olduğundan, ayrıca API anahtarınızın gerekli izinlere (read) sahip olduğundan ve Airtable'daki 'wallet' sütun adının doğru olduğundan emin olun.`);
        }
        const data = await response.json();
        console.log('Airtable API Raw Response:', data); // Debug: Airtable'dan gelen ham yanıtı logla
        if (!data.records || data.records.length === 0) {
            return [];
        }
        return data.records.map(record => {
            const imageUrl = record.fields.image ? record.fields.image : 'https://placehold.co/280x380/6c757d/FFFFFF?text=NFT+ERROR';
            return {
                id: record.id,
                name: record.fields.nft_name_list,
                atk: record.fields.ap || 50,
                def: record.fields.dp || 30,
                imageUrl: imageUrl,
                wallet: record.fields.wallet || null
            };
        });
    } catch (error) {
        gameMessagesElement.textContent = `NFT'ler yüklenirken bir sorun oluştu: ${error.message}. Lütfen konsolu kontrol edin ve Airtable ayarlarınızı doğrulayın.`;
        return [];
    }
}

// Cüzdan adresine göre kullanıcı adını çeken fonksiyon
async function fetchUserNameByWallet(walletAddress) {
    if (!walletAddress) return null;
    // Cüzdan adresini normalleştir
    const cleanWalletAddress = walletAddress.toLowerCase().trim();
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_USER_TABLE_NAME}?filterByFormula={wallet}='${cleanWalletAddress}'`;
    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            console.error(`Airtable user_list API hatası: ${response.status}`);
            return null;
        }
        const data = await response.json();
        if (data.records && data.records.length > 0) {
            return data.records[0].fields.name_surname || null;
        }
    } catch (error) {
        console.error('Error fetching user name from Airtable:', error);
    }
    return null;
}

// Cüzdan adresini maskeleme fonksiyonu
function maskWalletAddress(address, visibleChars = 4) {
    if (!address || address.length < visibleChars * 2 + 3) { // 3 for "..."
        return address; // Maskelemek için yeterince uzun değil
    }
    return `${address.substring(0, visibleChars)}...${address.substring(address.length - visibleChars)}`;
}

// Oyunun başlangıç durumuna getirilmesi
async function initializeGame() {
    gameActive = false;
    currentTurn = 0;
    turnActionTaken = false;
    currentBattleId = null;
    selectedPlayerNFT = null;

    // Cüzdan adresi henüz alınmadıysa, bekle
    if (!playerWalletAddress) {
        displayWalletAddress.textContent = 'Cüzdan bekleniyor...';
        return;
    }

    setTimeout(async () => {
        // Cüzdan adresini göster
        displayWalletAddress.textContent = maskWalletAddress(playerWalletAddress || 'Bulunamadı');

        gameContainer.style.display = 'none';
        characterSelectionScreen.style.display = 'flex';
        loadingNFTsMessage.style.display = 'block';
        characterGrid.innerHTML = '';

        // Cüzdan adresiyle NFT'leri çek
        allFetchedNFTs = await fetchNFTsFromAirtable(); // Tüm NFT'leri önce çek

        // Cüzdan adreslerini normalleştirerek filtrele
        const cleanedPlayerWalletAddress = playerWalletAddress ? playerWalletAddress.toLowerCase().trim() : null;
        const playerNFTs = allFetchedNFTs.filter(nft => nft.wallet && nft.wallet.toLowerCase().trim() === cleanedPlayerWalletAddress);
        opponentNFTs = allFetchedNFTs.filter(nft => nft.wallet && nft.wallet.toLowerCase().trim() !== cleanedPlayerWalletAddress);

        loadingNFTsMessage.style.display = 'none';

        if (playerNFTs.length > 0) {
            displayNFTsForSelection(playerNFTs);
        } else {
            characterGrid.innerHTML = '<p class="text-center text-red-400 col-span-full">Bu cüzdana ait NFT bulunamadı veya bir hata oluştu. NFT Doğrulaması yapmadıysanız Venus Bot aracılığıyla doğrulama talebi göndermek için Görevler sayfasını inceleyin.</p>';
        }

        startBattleButton.classList.add('hidden');
        restartButton.classList.add('hidden');
        attackButton.classList.add('hidden');
        buffButton.classList.add('hidden');
        disableActionButtons();
        selectCharacterButton.classList.add('disabled');
        selectCharacterButton.disabled = true;
    }, 500);
}

// Seçim için NFT'leri gösteren fonksiyon
function displayNFTsForSelection(nfts) {
    characterGrid.innerHTML = '';
    nfts.forEach(nft => {
        const card = document.createElement('div');
        card.classList.add('character-selection-card');
        card.innerHTML = `
            <img src="${nft.imageUrl}" alt="${nft.name}" onerror="this.onerror=null;this.src='https://placehold.co/150x150/6c757d/FFFFFF?text=NFT+ERROR';">
            <h3>${nft.name}</h3>
            <p>ATK: ${nft.atk} | DEF: ${nft.def}</p>
        `;
        card.addEventListener('click', () => selectNFT(nft, card));
        characterGrid.appendChild(card);
    });
}

// NFT seçme fonksiyonu
function selectNFT(nft, cardElement) {
    const previouslySelected = document.querySelector('.character-selection-card.selected');
    if (previouslySelected) previouslySelected.classList.remove('selected');
    cardElement.classList.add('selected');
    selectedPlayerNFT = nft;
    selectCharacterButton.classList.remove('disabled');
    selectCharacterButton.disabled = false;
}

// Seçilen NFT ile oyunu başlatma
async function startGameWithSelectedNFT() {
    if (!selectedPlayerNFT) {
        gameMessagesElement.textContent = "Lütfen bir karakter seçin!";
        return;
    }

    let player1Name = "SEN";
    // Cüzdan adresine göre kullanıcı adını çek
    if (playerWalletAddress) {
        const fetchedName = await fetchUserNameByWallet(playerWalletAddress);
        if (fetchedName) {
            player1Name = fetchedName;
        }
    }
    player1 = new Player(player1Name, initialPlayerHp, 5, 'Siz', false, selectedPlayerNFT);
    currentBattleId = selectedPlayerNFT.id;

    let player2Name = "RAKİP";
    let player2CharacterData;

    if (opponentNFTs.length > 0) {
        // Rakip NFT'lerinden rastgele birini seç
        const player2CharIndex = Math.floor(Math.random() * opponentNFTs.length);
        player2CharacterData = opponentNFTs[player2CharIndex];
        if (player2CharacterData.wallet) {
            const fetchedOpponentName = await fetchUserNameByWallet(player2CharacterData.wallet);
            if (fetchedOpponentName) {
                player2Name = fetchedOpponentName;
            }
        }
    } else {
        // Rakip NFT yoksa varsayılan karakter havuzundan seç
        const player2CharIndex = Math.floor(Math.random() * characterDataPool.length);
        player2CharacterData = characterDataPool[player2CharIndex];
    }
    player2 = new Player(player2Name, initialPlayerHp, 4, 'Rakip', true, player2CharacterData);

    currentPlayer = player1;
    gameActive = true;

    characterSelectionScreen.style.display = 'none';
    gameContainer.style.display = 'flex';

    mainGameContent.style.display = 'none';
    gameMessagesElement.style.display = 'none';

    battleIntroScreen.style.opacity = '1';
    battleIntroScreen.style.pointerEvents = 'auto';

    introPlayerCard.innerHTML = player1.character.toVisualHtml();
    introPlayerName.textContent = player1.character.toNameHtml();

    setTimeout(() => {
        introPlayerCard.style.transform = 'scale(1)';
        introPlayerCard.style.opacity = '1';
        introPlayerName.style.opacity = '1';
    }, 100);

    setTimeout(() => {
        battleIntroScreen.style.opacity = '0';
        battleIntroScreen.style.pointerEvents = 'none';
        mainGameContent.style.display = 'flex';
        gameMessagesElement.style.display = 'flex';
        gameMessagesElement.textContent = `SAVAŞ BAŞLADI! SIRA SENDE.`;
        updateUI();
        attackButton.classList.remove('hidden');
        buffButton.classList.remove('hidden');
        restartButton.classList.add('hidden');
    }, 3000);
}

// Kullanıcı arayüzünü güncelleyen fonksiyon
function updateUI() {
    player1NameDisplay.textContent = player1.name;
    player2NameDisplay.textContent = player2.name;

    const p1Hp = (player1.character.currentHp / initialPlayerHp) * 100;
    player1HpText.textContent = Math.max(0, player1.character.currentHp);
    player1HpBar.style.width = `${Math.max(0, p1Hp)}%`;
    player1HpBar.classList.toggle('low-hp', p1Hp <= 30);
    player1CharacterCardVisualElement.innerHTML = player1.character.toVisualHtml();
    player1CharacterNameElement.textContent = player1.character.toNameHtml();
    player1CharacterStatsElement.innerHTML = player1.character.toStatsHtml(player1.name, player1.level);

    const p2Hp = (player2.character.currentHp / initialPlayerHp) * 100;
    player2HpText.textContent = Math.max(0, player2.character.currentHp);
    player2HpBar.style.width = `${Math.max(0, p2Hp)}%`;
    player2HpBar.classList.toggle('low-hp', p2Hp <= 30);
    player2CharacterCardVisualElement.innerHTML = player2.character.toVisualHtml();
    player2CharacterNameElement.textContent = player2.character.toNameHtml();
    player2CharacterStatsElement.innerHTML = player2.character.toStatsHtml(player2.name, player2.level);

    player1Area.classList.toggle('current-player-glow', currentPlayer === player1);
    player2Area.classList.toggle('current-player-glow', currentPlayer === player2);

    if (gameActive && !currentPlayer.isAI) {
        if (!turnActionTaken) enableActionButtons();
        else disableActionButtons();
    } else {
        disableActionButtons();
    }
}

// Aksiyon butonlarını devre dışı bırakan fonksiyon
function disableActionButtons() {
    attackButton.classList.add('disabled');
    attackButton.disabled = true;
    buffButton.classList.add('disabled');
    buffButton.disabled = true;
}

// Aksiyon butonlarını etkinleştiren fonksiyon
function enableActionButtons() {
    attackButton.classList.remove('disabled');
    attackButton.disabled = false;
    buffButton.classList.remove('disabled');
    buffButton.disabled = false;
}

// Saldırı işlemini yöneten fonksiyon
function handleAttack() {
    if (!gameActive || turnActionTaken) return;
    turnActionTaken = true;
    disableActionButtons();

    const attacker = currentPlayer.character;
    const defender = (currentPlayer === player1) ? player2.character : player1.character;
    const defenderVisualElement = (currentPlayer === player1) ? player2CharacterCardVisualElement : player1CharacterCardVisualElement;
    const attackerVisualElement = (currentPlayer === player1) ? player1CharacterCardVisualElement : player2CharacterCardVisualElement;

    attackerVisualElement.classList.add('attacking');
    setTimeout(() => {
        attackerVisualElement.classList.remove('attacking');
    }, 800);

    let damage = Math.max(0, attacker.effectiveAtk - defender.effectiveDef);
    let message = `${currentPlayer.name}'in ${attacker.name} saldırdı! `;
    if (Math.random() < attacker.criticalChance) {
        damage = Math.round(damage * attacker.criticalMultiplier);
        message += `KRİTİK VURUŞ! `;
    }
    defender.currentHp -= damage;
    message += `${defender.name}'e ${damage} hasar verdi.`;
    gameMessagesElement.textContent = message;

    defenderVisualElement.classList.add('hit');
    setTimeout(() => {
        defenderVisualElement.classList.remove('hit');
    }, 900);

    updateUI();
    setTimeout(() => {
        if (!checkGameOver()) endTurn();
    }, 1000);
}

// Buff işlemini yöneten fonksiyon
function handleBuff() {
    if (!gameActive || turnActionTaken) return;
    turnActionTaken = true;
    disableActionButtons();

    const playerCharacter = currentPlayer.character;
    const playerVisualElement = (currentPlayer === player1) ? player1CharacterCardVisualElement : player2CharacterCardVisualElement;

    playerCharacter.applyBuff();
    gameMessagesElement.textContent = `${currentPlayer.name}'in ${playerCharacter.name} güçlendi! Saldırı gücü ${playerCharacter.buffTurnsLeft} tur boyunca arttı.`;

    playerVisualElement.classList.add('buffed-animation');
    setTimeout(() => {
        playerVisualElement.classList.remove('buffed-animation');
    }, 1500);

    updateUI();
    setTimeout(() => {
        endTurn();
    }, 1000);
}

// Turu bitiren fonksiyon
function endTurn() {
    currentTurn++;
    currentPlayer.character.decrementBuffTurn();
    currentPlayer = (currentPlayer === player1) ? player2 : player1;
    turnActionTaken = false;

    gameMessagesElement.textContent = `SIRA ${currentPlayer.name.toUpperCase()}DE.`;
    updateUI();

    if (currentPlayer.isAI) setTimeout(aiTurn, 1500);
}

// Oyun bitişini kontrol eden fonksiyon
function checkGameOver() {
    if (player1.character.currentHp <= 0 || player2.character.currentHp <= 0) {
        gameActive = false;
        disableActionButtons();
        restartButton.classList.remove('hidden');
        let winnerPlayer = null;
        let winnerMessage = "";
        let winner = "";

        if (player1.character.currentHp <= 0 && player2.character.currentHp <= 0) {
            winnerMessage = "BERABERE! İki karakter de düştü!";
            winner = "Draw";
        } else if (player1.character.currentHp <= 0) {
            winnerMessage = `${player2.name} kazandı! ${player1.name} düştü!`;
            winnerPlayer = player2;
            winner = player2.name;
        } else {
            winnerMessage = `${player1.name} kazandı! ${player2.name} düştü!`;
            winnerPlayer = player1;
            winner = player1.name;
        }
        gameMessagesElement.textContent = winnerMessage;

        if (winnerPlayer) {
            const winnerCardVisualElement = (winnerPlayer === player1) ? player1CharacterCardVisualElement : player2CharacterCardVisualElement;
            winnerCardVisualElement.classList.add('winner-animation');
            setTimeout(() => {
                winnerCardVisualElement.classList.remove('winner-animation');
            }, 2000);
        }

        sendBattleResultToWebhook(winner, player1.character.id);
        return true;
    }
    return false;
}

// Yapay zeka turunu yöneten fonksiyon
function aiTurn() {
    if (currentPlayer.character.buffActive && currentPlayer.character.buffTurnsLeft > 0) {
        handleAttack();
    } else if (Math.random() < 0.7) { // %70 saldırma şansı
        handleAttack();
    } else { // %30 buff kullanma şansı
        handleBuff();
    }
}

// Savaş sonucunu webhook'a gönderen fonksiyon
async function sendBattleResultToWebhook(winner, battleId) {
    const payload = {
        battleId: battleId,
        timestamp: new Date().toISOString(),
        player1: {
            name: player1.name,
            character: player1.character.name,
            finalHp: Math.max(0, player1.character.currentHp),
            level: player1.level,
            isAI: player1.isAI
        },
        player2: {
            name: player2.name,
            character: player2.character.name,
            finalHp: Math.max(0, player2.character.currentHp),
            level: player2.level,
            isAI: player2.isAI
        },
        totalTurns: currentTurn,
        winner: winner
    };

    console.log('Webhook Payload Object:', payload); // Payload nesnesini logla
    console.log('Webhook Payload JSON:', JSON.stringify(payload)); // JSON stringini logla

    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Webhook send failed:', response.status, errorText);
        } else {
            console.log('Battle results sent to webhook successfully!');
        }
    } catch (error) {
        console.error('Error sending battle results to webhook:', error);
    }
}

// postMessage ile cüzdan adresini dinle
window.addEventListener('message', async (event) => {
    // Güvenlik: Mesajın beklenen kaynaktan geldiğini doğrulayın
    // Webflow sitenizin domainini buraya ekleyin
    if (event.origin !== 'https://cryptoyogi.world' && event.origin !== 'https://www.cryptoyogi.world') { // Webflow domaininizi buraya ekleyin
        console.warn('Güvenlik uyarısı: Bilinmeyen kaynaktan mesaj alındı!', event.origin);
        return;
    }

    if (event.data && event.data.type === 'walletAddress') {
        playerWalletAddress = event.data.address;
        console.log('postMessage ile alınan cüzdan adresi:', playerWalletAddress);
        // Cüzdan adresi alındıktan sonra oyunu başlat
        initializeGame();
    }
});