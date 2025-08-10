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
    constructor(id, name, atk, def, initialHp, imageUrl, level, critChance) {
        this.id = id;
        this.name = name;
        this.baseAtk = atk;
        this.baseDef = def;
        this.currentHp = initialHp;
        this.maxHp = initialHp; // Maksimum can değeri eklendi
        this.imageUrl = imageUrl;
        this.level = level || 1;
        this.criticalChance = critChance || 0.2;
        this.buffActive = false;
        this.buffTurnsLeft = 0;
        this.buffAmount = 15;
        this.criticalMultiplier = 1.5;
        this.items = [];
    }

    toVisualHtml() {
        return `<img src="${this.imageUrl}" alt="${this.name} Image" class="rounded-lg" onerror="this.onerror=null;this.src='https://placehold.co/280x380/6c757d/FFFFFF?text=NFT+ERROR';">`;
    }

    toNameHtml() {
        return this.name;
    }

    get effectiveAtk() {
        return this.baseAtk + (this.buffActive ? this.buffAmount : 0);
    }

    get effectiveDef() {
        return this.baseDef;
    }

    applyBuff() {
        this.buffActive = true;
        this.buffTurnsLeft = 2;
    }

    decrementBuffTurn() {
        if (this.buffActive) {
            this.buffTurnsLeft--;
            if (this.buffTurnsLeft <= 0) {
                this.buffActive = false;
                this.buffTurnsLeft = 0;
            }
        }
    }

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
    constructor(name, initialHp, level = 1, otherInfo = '', isAI = false, characterData, items = []) {
        this.name = name;
        this.level = level;
        this.otherInfo = otherInfo;
        this.isAI = isAI;
        this.character = new Character(characterData.id, characterData.name, characterData.atk, characterData.def, initialHp, characterData.imageUrl, characterData.level, characterData.critChance);
        this.character.items = items;
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
let playerWalletAddress = null;

// DOM elementleri
const gameContainer = document.getElementById('game-container');
const characterSelectionScreen = document.getElementById('character-selection-screen');
const displayWalletAddress = document.getElementById('displayWalletAddress');
const characterGrid = document.getElementById('character-grid');
const selectCharacterButton = document.getElementById('select-character-button');
const loadingNFTsMessage = document.getElementById('loading-nfts');

const player1Bar = document.getElementById('player1-bar');
const player1Avatar = document.getElementById('player1-avatar');
const player1NameBar = document.getElementById('player1-name-bar');
const player1HpBarSmall = document.getElementById('player1-hp-bar-small');
const player1HpBarText = document.getElementById('player1-hp-bar-text');
const player1LevelBar = document.getElementById('player1-level-bar');
const player1AtkBar = document.getElementById('player1-atk-bar');
const player1DefBar = document.getElementById('player1-def-bar');
const player1CritBar = document.getElementById('player1-crit-bar');
const player1ItemsBar = document.getElementById('player1-items-bar');

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

// Airtable API bilgileri
const AIRTABLE_API_KEY = 'patHY39bvGqiBVDCN.719c8ac3361113671055eec87d8fffd99849206756828555e8c156953';
const AIRTABLE_BASE_ID = 'appYd2h4K7z0lF82K';
const AIRTABLE_TABLE_ID = 'tblJ4W4S21TqgB4h0';
const AIRTABLE_ENDPOINT = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`;

<<<<<<< HEAD
// NFT verilerini AirTable'dan çek
async function fetchNFTsFromAirtable(minLevel = 1) {
    loadingNFTsMessage.textContent = 'NFT\'ler yükleniyor...';
=======
// Airtable'dan NFT'leri çeken fonksiyon
async function fetchNFTsFromAirtable() {
    let url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_NFT_TABLE_NAME}`;
>>>>>>> parent of 684a79f (Update arena_v3.js)
    try {
        const response = await fetch(AIRTABLE_ENDPOINT, {
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`
            }
        });
        if (!response.ok) {
            throw new Error(`Airtable API'dan veri çekme hatası: ${response.status}`);
        }
        const data = await response.json();
<<<<<<< HEAD
        allFetchedNFTs = data.records.filter(record => record.fields.Level >= minLevel);
        renderCharacterSelection(allFetchedNFTs);
        loadingNFTsMessage.textContent = '';
=======
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
                wallet: record.fields.wallet || null,
                level: record.fields.level || 1,
                critChance: record.fields.crit_chance || 0.2,
                // Safely parse items, default to empty array if parsing fails or field is missing
                items: (() => {
                    try {
                        return record.fields.items ? JSON.parse(record.fields.items) : [];
                    } catch (e) {
                        console.error(`Error parsing items for NFT ${record.fields.nft_name_list || record.id}:`, e);
                        return []; // Return empty array on error
                    }
                })()
            };
        });
>>>>>>> parent of 684a79f (Update arena_v3.js)
    } catch (error) {
        console.error('Veri çekme hatası:', error);
        loadingNFTsMessage.textContent = 'NFT\'ler yüklenirken bir hata oluştu.';
    }
}

<<<<<<< HEAD
// Karakter seçme ekranını oluştur
function renderCharacterSelection(nfts) {
=======
// Cüzdan adresine göre kullanıcı adını çeken fonksiyon
async function fetchUserNameByWallet(walletAddress) {
    if (!walletAddress) return null;
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
    if (!address || address.length < visibleChars * 2 + 3) {
        return address;
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
    selectedItemsForBattle = []; // Seçilen itemları sıfırla

    gameContainer.style.display = 'none';
    itemSelectionScreen.style.display = 'none'; // Item seçim ekranını gizle
    characterSelectionScreen.style.display = 'flex'; // Karakter seçim ekranını göster
    characterGrid.innerHTML = '';
    selectCharacterButton.classList.add('disabled');
    selectCharacterButton.disabled = true;
    restartButton.classList.add('hidden');
    disableItemSlots(); // Item slotlarını devre dışı bırak

    // Cüzdan adresi henüz alınmadıysa, bekleme mesajını göster ve geri dön
    if (!playerWalletAddress) {
        displayWalletAddress.textContent = 'Cüzdan bekleniyor...';
        loadingNFTsMessage.style.display = 'block';
        loadingNFTsMessage.textContent = 'Cüzdan bilgisi bekleniyor...';
        return; // postMessage dinleyicisi tarafından tekrar çağrılacak
    }

    // Cüzdan adresi mevcutsa, NFT'leri çekmeye başla
    loadingNFTsMessage.textContent = 'NFT\'ler yükleniyor...'; // Yükleme mesajını güncelle
    loadingNFTsMessage.style.display = 'block'; // Yükleme mesajını göster

    const playerNFTs = [];
    const opponentNFTs = [];

    try {
        allFetchedNFTs = await fetchNFTsFromAirtable();
        const cleanedPlayerWalletAddress = playerWalletAddress ? playerWalletAddress.toLowerCase().trim() : null;
        
        allFetchedNFTs.forEach(nft => {
            if (nft.wallet && nft.wallet.toLowerCase().trim() === cleanedPlayerWalletAddress) {
                playerNFTs.push(nft);
            } else {
                opponentNFTs.push(nft);
            }
        });

        displayWalletAddress.textContent = maskWalletAddress(playerWalletAddress || 'Bulunamadı');
        loadingNFTsMessage.style.display = 'none'; // Yükleme tamamlandığında gizle

        if (playerNFTs.length > 0) {
            displayNFTsForSelection(playerNFTs);
        } else {
            characterGrid.innerHTML = '<p class="text-center text-red-400 col-span-full">Bu cüzdana ait NFT bulunamadı veya bir hata oluştu. NFT Doğrulaması yapmadıysanız Venus Bot aracılığıyla doğrulama talebi göndermek için Görevler sayfasını inceleyin.</p>';
            selectCharacterButton.classList.add('disabled'); // NFT yoksa butonu devre dışı bırak
            selectCharacterButton.disabled = true;
        }
    } catch (error) {
        gameMessagesElement.textContent = `NFT'ler yüklenirken bir sorun oluştu: ${error.message}. Lütfen konsolu kontrol edin ve Airtable ayarlarınızı doğrulayın.`;
        console.error('initializeGame hatası:', error);
        loadingNFTsMessage.textContent = 'NFT yüklenirken hata oluştu.';
        loadingNFTsMessage.style.display = 'block';
        selectCharacterButton.classList.add('disabled');
        selectCharacterButton.disabled = true;
    }
}

// Seçim için NFT'leri gösteren fonksiyon
function displayNFTsForSelection(nfts) {
    characterGrid.innerHTML = '';
>>>>>>> parent of 684a79f (Update arena_v3.js)
    if (nfts.length === 0) {
        characterGrid.innerHTML = '<p class="text-center text-gray-400">Gösterilecek NFT bulunamadı. Lütfen daha sonra tekrar deneyin.</p>';
        return;
    }
    characterGrid.innerHTML = '';
    nfts.forEach(nft => {
        const card = document.createElement('div');
        card.className = 'character-card bg-cyber-light border-2 border-neon-cyan p-4 rounded-xl flex flex-col items-center cursor-pointer hover:border-neon-pink transition-all duration-300 relative';
        card.dataset.id = nft.id;
        card.dataset.name = nft.fields.Name;
        card.dataset.atk = nft.fields.ATK;
        card.dataset.def = nft.fields.DEF;
        card.dataset.hp = nft.fields.HP;
        card.dataset.imageUrl = nft.fields.Image && nft.fields.Image.length > 0 ? nft.fields.Image[0].url : 'https://placehold.co/200x200/6c757d/FFFFFF?text=NFT+ERROR';
        card.dataset.level = nft.fields.Level;
        card.dataset.critChance = nft.fields['Crit Chance'];
        
        card.innerHTML = `
            <img src="${card.dataset.imageUrl}" alt="${card.dataset.name}" class="rounded-lg mb-4 w-full h-auto">
            <h3 class="font-bold text-lg text-neon-cyan">${card.dataset.name}</h3>
            <p class="text-sm">Seviye: <span class="text-neon-green">${card.dataset.level}</span></p>
            <p class="text-sm">ATK: <span class="text-red-400">${card.dataset.atk}</span></p>
            <p class="text-sm">DEF: <span class="text-green-400">${card.dataset.def}</span></p>
            <div class="absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-full border border-neon-cyan">ID: ${nft.id.substring(0, 4)}...</div>
        `;
        card.addEventListener('click', () => {
            document.querySelectorAll('.character-card').forEach(c => c.classList.remove('selected-card'));
            card.classList.add('selected-card');
            selectedPlayerNFT = nft;
            selectCharacterButton.disabled = false;
        });
        characterGrid.appendChild(card);
    });
}

<<<<<<< HEAD
// Oyunun başlatılması
function initializeGame() {
    // console.log('Oyun başlatılıyor. Cüzdan adresi:', playerWalletAddress);
    characterSelectionScreen.style.display = 'block';
    gameContainer.style.display = 'none';

    // Cüzdan adresini ekrana yazdır (eğer varsa)
=======
// NFT seçme fonksiyonu
function selectNFT(nft, cardElement) {
    const previouslySelected = document.querySelector('.character-selection-card.selected');
    if (previouslySelected) previouslySelected.classList.remove('selected');
    cardElement.classList.add('selected');
    selectedPlayerNFT = nft;
    selectCharacterButton.classList.remove('disabled');
    selectCharacterButton.disabled = false;
}

// Seçilen NFT ile oyunu başlatma (artık item seçimine geçiş yapıyor)
async function startGameWithSelectedNFT() {
    if (!selectedPlayerNFT) {
        gameMessagesElement.textContent = "Lütfen bir karakter seçin!";
        console.error("Hata: Karakter seçilmedi. Savaş başlatılamıyor.");
        return;
    }

    // Karakter seçim ekranını gizle, item seçim ekranını göster
    characterSelectionScreen.style.display = 'none';
    itemSelectionScreen.style.display = 'flex';
    displayItemsForSelection();
}

// Item seçimi için itemları gösteren fonksiyon
function displayItemsForSelection() {
    itemGrid.innerHTML = '';
    selectedItemsForBattle = []; // Seçimi sıfırla
    updateSelectedItemCount();
    confirmItemsButton.classList.add('disabled');
    confirmItemsButton.disabled = true;

    // Tüm itemData'yı göster
    itemData.forEach(item => {
        const card = document.createElement('div');
        card.classList.add('item-selection-card');
        card.dataset.itemId = item.id; // Item ID'sini kaydet
        card.innerHTML = `
            <img src="${item.imageUrl}" alt="${item.name}" onerror="this.onerror=null;this.src='https://placehold.co/80x80/6c757d/FFFFFF?text=ITEM+ERROR';">
            <h3>${item.name}</h3>
            <p>${item.description}</p>
        `;
        card.addEventListener('click', () => toggleItemSelection(item, card));
        itemGrid.appendChild(card);
    });
}

// Item seçme/seçimi kaldırma fonksiyonu
function toggleItemSelection(item, cardElement) {
    const index = selectedItemsForBattle.findIndex(selected => selected.id === item.id);

    if (index > -1) {
        // Zaten seçiliyse kaldır
        selectedItemsForBattle.splice(index, 1);
        cardElement.classList.remove('selected');
    } else {
        // Seçili değilse ekle (maksimum sınıra ulaşılmadıysa)
        if (selectedItemsForBattle.length < MAX_ITEM_SELECTION) {
            selectedItemsForBattle.push(item);
            cardElement.classList.add('selected');
        } else {
            // Maksimum item sayısına ulaşıldı mesajı
            gameMessagesElement.textContent = `En fazla ${MAX_ITEM_SELECTION} eşya seçebilirsiniz!`;
            setTimeout(() => gameMessagesElement.textContent = '', 2000); // Mesajı kısa süre sonra temizle
        }
    }
    updateSelectedItemCount();
    // 6 item seçildiyse butonu etkinleştir
    if (selectedItemsForBattle.length === MAX_ITEM_SELECTION) {
        confirmItemsButton.classList.remove('disabled');
        confirmItemsButton.disabled = false;
    } else {
        confirmItemsButton.classList.add('disabled');
        confirmItemsButton.disabled = true;
    }
}

// Seçilen item sayısını güncelleyen fonksiyon
function updateSelectedItemCount() {
    selectedItemCount.textContent = `${selectedItemsForBattle.length}/${MAX_ITEM_SELECTION}`;
}

// Item seçimini onaylama ve savaşı başlatma
async function confirmItemSelection() {
    if (selectedItemsForBattle.length !== MAX_ITEM_SELECTION) {
        gameMessagesElement.textContent = `Lütfen ${MAX_ITEM_SELECTION} eşya seçin!`;
        return;
    }

    let player1Name = "SEN";
>>>>>>> parent of 684a79f (Update arena_v3.js)
    if (playerWalletAddress) {
        displayWalletAddress.textContent = `Cüzdan Adresiniz: ${playerWalletAddress}`;
    }

    // Oyuncu karakterlerini seçme
    if (allFetchedNFTs.length === 0) {
        fetchNFTsFromAirtable();
    } else {
        renderCharacterSelection(allFetchedNFTs);
    }

    selectCharacterButton.addEventListener('click', () => {
        if (selectedPlayerNFT) {
            startBattle(selectedPlayerNFT);
        } else {
            // Seçili karakter yoksa uyarı ver
            // Kullanıcı arayüzüne bir mesaj kutusu ekleyerek bildirilebilir
            console.warn('Lütfen bir karakter seçin.');
        }
    });

    attackButton.addEventListener('click', () => {
        if (gameActive && currentPlayer === player1 && !turnActionTaken) {
            performAttack(player1, player2);
            turnActionTaken = true;
            nextTurn();
        }
    });

    buffButton.addEventListener('click', () => {
        if (gameActive && currentPlayer === player1 && !turnActionTaken) {
            player1.character.applyBuff();
            logMessage(`Player 1'in saldırı gücü arttı!`);
            turnActionTaken = true;
            nextTurn();
        }
    });

    restartButton.addEventListener('click', () => {
        resetGame();
    });
}

// Savaşın başlaması
function startBattle(playerNFT) {
    characterSelectionScreen.style.display = 'none';
    gameContainer.style.display = 'flex';
    gameActive = true;
    currentTurn = 0;
    
    // Player 1'i seçilen NFT ile oluştur
    const playerNFTData = {
        id: playerNFT.id,
        name: playerNFT.fields.Name,
        atk: playerNFT.fields.ATK,
        def: playerNFT.fields.DEF,
        initialHp: playerNFT.fields.HP,
        imageUrl: playerNFT.fields.Image && playerNFT.fields.Image.length > 0 ? playerNFT.fields.Image[0].url : 'https://placehold.co/200x200/6c757d/FFFFFF?text=NFT+ERROR',
        level: playerNFT.fields.Level,
        critChance: playerNFT.fields['Crit Chance']
    };
    player1 = new Player('Sen', initialPlayerHp, playerNFTData.level, '', false, playerNFTData);

    // AI rakibi rastgele bir NFT ile oluştur
    const availableOpponentNFTs = allFetchedNFTs.filter(nft => nft.id !== playerNFT.id);
    if (availableOpponentNFTs.length === 0) {
        console.error("Rakip için uygun NFT bulunamadı. Lütfen daha fazla NFT yükleyin.");
        return;
    }
    const randomOpponentNFT = availableOpponentNFTs[Math.floor(Math.random() * availableOpponentNFTs.length)];
    const opponentNFTData = {
        id: randomOpponentNFT.id,
        name: randomOpponentNFT.fields.Name,
        atk: randomOpponentNFT.fields.ATK,
        def: randomOpponentNFT.fields.DEF,
        initialHp: randomOpponentNFT.fields.HP,
        imageUrl: randomOpponentNFT.fields.Image && randomOpponentNFT.fields.Image.length > 0 ? randomOpponentNFT.fields.Image[0].url : 'https://placehold.co/200x200/6c757d/FFFFFF?text=NFT+ERROR',
        level: randomOpponentNFT.fields.Level,
        critChance: randomOpponentNFT.fields['Crit Chance']
    };
    player2 = new Player(opponentNFTData.name, initialPlayerHp, opponentNFTData.level, '', true, opponentNFTData);

    currentPlayer = player1;
    logMessage(`Savaş başladı! ${player1.name} vs ${player2.name}`);

<<<<<<< HEAD
    // UI'ı başlangıç değerleriyle güncelle
    updateUI();
    // Battle intro ekranını göster
    showBattleIntroScreen(player1, player2);
}

// Battle intro ekranını göster ve gizle
function showBattleIntroScreen(player, opponent) {
    battleIntroScreen.style.display = 'flex';
    
    // Player 1
    introPlayerCard.innerHTML = `
        <div class="character-card-visual-small">
            ${player.character.toVisualHtml()}
        </div>
        <div class="text-center mt-4">
            <h3 class="font-bold text-lg text-neon-cyan">${player.character.name}</h3>
            <p class="text-sm text-neon-green">Seviye: ${player.character.level}</p>
        </div>
    `;
    introPlayerName.textContent = player.name;
    
    // Player 2
    const introOpponentCard = document.getElementById('intro-opponent-card');
    const introOpponentName = document.getElementById('intro-opponent-name');
    introOpponentCard.innerHTML = `
        <div class="character-card-visual-small">
            ${opponent.character.toVisualHtml()}
        </div>
        <div class="text-center mt-4">
            <h3 class="font-bold text-lg text-neon-pink">${opponent.character.name}</h3>
            <p class="text-sm text-neon-green">Seviye: ${opponent.character.level}</p>
        </div>
    `;
    introOpponentName.textContent = opponent.name;

    setTimeout(() => {
        battleIntroScreen.style.display = 'none';
        updateUI(); // Savaş ekranına geçmeden önce UI'ı güncelle
=======
    itemSelectionScreen.style.display = 'none'; // Item seçim ekranını gizle
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
        enableItemSlots(); // Item slotlarını etkinleştir
        restartButton.classList.add('hidden');
>>>>>>> parent of 684a79f (Update arena_v3.js)
    }, 3000);
}


// UI güncelleme fonksiyonu
function updateUI() {
<<<<<<< HEAD
    // Player 1 (Sen) Barı Güncelleme
    player1Bar.style.display = 'flex';
=======
    // Oyuncu 1 (Sen) Barı Güncellemesi
    player1Avatar.src = player1.character.imageUrl;
>>>>>>> parent of 684a79f (Update arena_v3.js)
    player1NameBar.textContent = player1.name;
    player1LevelBar.textContent = player1.character.level;
    player1AtkBar.textContent = player1.character.effectiveAtk;
    player1DefBar.textContent = player1.character.effectiveDef;
    player1CritBar.textContent = `${(player1.character.criticalChance * 100).toFixed(0)}%`;
    player1Avatar.innerHTML = player1.character.toVisualHtml();
    
    // Player 1 HP Barı Güncelleme
    updateHpBar(player1, player1HpBarSmall, player1HpBarText);

    // Player 1 Items Barı Güncelleme
    const player1ItemsBarContent = player1.character.items.map(item => `
        <div class="player-bar-item-icon">${item.icon}</div>
    `).join('');
    player1ItemsBar.innerHTML = player1ItemsBarContent;


    // Player 2 (Rakip) Alanını Güncelleme
    player2Area.style.display = 'flex';
    player2NameDisplay.textContent = player2.name;
    player2CharacterCardVisualElement.innerHTML = player2.character.toVisualHtml();
<<<<<<< HEAD
    player2CharacterNameElement.textContent = player2.character.name;
    player2CharacterStatsElement.innerHTML = player2.character.toStatsHtml(player2.name, player2.character.level);
    updateHpBar(player2, player2HpBar, player2HpText);

    // Oyuncu sırasına göre glow efektini güncelle
    if (currentPlayer === player1) {
        player1Bar.classList.add('current-player-glow');
        player2Area.classList.remove('current-player-glow');
        attackButton.disabled = false;
        buffButton.disabled = false;
=======
    player2CharacterNameElement.textContent = player2.character.toNameHtml();
    player2CharacterStatsElement.innerHTML = player2.character.toStatsHtml(player2.name, player2.level);

    // Oyuncu glow efektleri
    player1Bar.classList.toggle('current-player-glow', currentPlayer === player1); // Player1 barı için glow
    player2Area.classList.toggle('current-player-glow', currentPlayer === player2);

    if (gameActive && !currentPlayer.isAI) {
        enableItemSlots(); // Kendi sıramızda item slotlarını etkinleştir
>>>>>>> parent of 684a79f (Update arena_v3.js)
    } else {
        player1Bar.classList.remove('current-player-glow');
        player2Area.classList.add('current-player-glow');
        attackButton.disabled = true;
        buffButton.disabled = true;
    }
}

// HP barını güncelleme fonksiyonu - Tekilleştirildi
function updateHpBar(player, hpBarElement, hpTextElement) {
    const hpPercentage = (player.character.currentHp / player.character.maxHp) * 100;
    hpBarElement.style.width = `${hpPercentage}%`;
    hpTextElement.textContent = `${Math.floor(player.character.currentHp)} / ${player.character.maxHp}`;
    if (hpPercentage < 25) {
        hpBarElement.classList.add('low-hp');
    } else {
        hpBarElement.classList.remove('low-hp');
    }
}

// Saldırı fonksiyonu
function performAttack(attacker, defender) {
    if (!gameActive) return;

    let damage = Math.max(0, attacker.character.effectiveAtk - defender.character.effectiveDef);
    let isCritical = Math.random() < attacker.character.criticalChance;

    if (isCritical) {
        damage *= attacker.character.criticalMultiplier;
        logMessage(`💥 Kritik Vuruş! ${attacker.name} -> ${defender.name} (${Math.floor(damage)} hasar)`);
    } else {
        logMessage(`${attacker.name} -> ${defender.name} (${Math.floor(damage)} hasar)`);
    }

    defender.character.currentHp -= damage;
    console.log(`${defender.name} adlı oyuncunun canı: ${defender.character.currentHp}`);
    
    // Can değeri negatif olamaz
    if (defender.character.currentHp < 0) {
        defender.character.currentHp = 0;
    }
    
    updateUI(); // UI'ı her saldırıdan sonra güncelle

    if (checkGameOver()) {
        endGame();
    }
}

// Sıradaki tur
function nextTurn() {
    if (!gameActive) return;
    
    // Buff süresini azalt
    player1.character.decrementBuffTurn();
    player2.character.decrementBuffTurn();
    
    currentPlayer = (currentPlayer === player1) ? player2 : player1;
    turnActionTaken = false;
    currentTurn++;
    logMessage(`--- Tur ${currentTurn} ---`);
    updateUI();

    if (currentPlayer === player2) {
        setTimeout(aiTurn, 1500); // AI sırası için 1.5 saniye bekle
    }
}

// AI'nın sırası
function aiTurn() {
    if (!gameActive) return;

    const aiChoice = Math.random();
    if (aiChoice < 0.2 && !player2.character.buffActive) {
        // %20 şansla buff kullan (eğer aktif değilse)
        player2.character.applyBuff();
        logMessage(`Rakip güçlendi!`);
    } else {
        // Normal saldırı
        performAttack(player2, player1);
    }
    
    turnActionTaken = true;
    nextTurn();
}

// Oyun sonu kontrolü
function checkGameOver() {
    if (player1.character.currentHp <= 0) {
        logMessage(`Sen kaybettin!`);
        return true;
    }
    if (player2.character.currentHp <= 0) {
        logMessage(`Sen kazandın!`);
        return true;
    }
    return false;
}

// Oyunu bitir
function endGame() {
    gameActive = false;
    attackButton.disabled = true;
    buffButton.disabled = true;
    restartButton.style.display = 'block'; // Yeniden başlatma butonu göster
}

// Oyunu sıfırla
function resetGame() {
    gameActive = false;
    currentTurn = 0;
    player1 = null;
    player2 = null;
    currentPlayer = null;
    turnActionTaken = false;
    currentBattleId = null;
    selectedPlayerNFT = null;
    gameMessagesElement.innerHTML = '';
    restartButton.style.display = 'none';
    gameContainer.style.display = 'none';
    characterSelectionScreen.style.display = 'block';
    
    // UI'ı temizle
    updateUI();
    // Yeni karakter seçimi için AirTable'dan verileri tekrar çek
    fetchNFTsFromAirtable();
}

// Mesajları loglama fonksiyonu
function logMessage(message) {
    const p = document.createElement('p');
    p.textContent = message;
    gameMessagesElement.appendChild(p);
    gameMessagesElement.scrollTop = gameMessagesElement.scrollHeight; // En son mesaja kaydır
}

// postMessage ile cüzdan adresini dinle
window.addEventListener('message', async (event) => {
    const allowedOrigins = [
        'https://cryptoyogi.webflow.io',
        'https://www.cryptoyogi.com',
        'https://yagizcanmutlu.github.io',
        'https://www.cryptoyogi.world'
    ];

    if (!allowedOrigins.includes(event.origin)) {
        console.warn('Güvenlik uyarısı: Bilinmeyen kaynaktan mesaj alındı!', event.origin);
        return;
    }

    if (event.data && event.data.type === 'walletAddress') {
        playerWalletAddress = event.data.address;
        initializeGame();
    }
});

// Oyun butonları için olay dinleyicileri
<<<<<<< HEAD
document.addEventListener('DOMContentLoaded', () => {
    // DOM yüklendikten sonra oyunu başlatmak için, postMessage beklemesi yerine direkt initializeGame çağrılabilir.
    // Eğer postMessage mekanizması dışarıdan bir adres alıyorsa, bu kısım dışarıda kalabilir.
    // Eğer adres yoksa, anonim bir şekilde oyunu başlatmak için bu satır kullanılabilir:
    // initializeGame();
=======
selectCharacterButton.addEventListener('click', startGameWithSelectedNFT);
confirmItemsButton.addEventListener('click', confirmItemSelection); // Yeni item onay butonu
restartButton.addEventListener('click', initializeGame);

// Item slotlarına olay dinleyicileri ekle
itemSlotsContainer.addEventListener('click', (event) => {
    const clickedSlot = event.target.closest('.item-slot');
    if (clickedSlot && !clickedSlot.classList.contains('disabled')) {
        const itemId = clickedSlot.dataset.itemId;
        if (itemId) {
            handleItemUse(itemId, clickedSlot);
        }
    }
>>>>>>> parent of 684a79f (Update arena_v3.js)
});

// Oyunun ilk çağrısı
initializeGame();
