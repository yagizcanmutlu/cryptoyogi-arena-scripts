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

// Item verileri (şimdilik statik, Airtable'dan çekilebilir)
const itemData = [
    { id: 'item1', name: 'HODLer’s Amulet', imageUrl: 'https://cdn.prod.website-files.com/67fb1cd83af51c4fe96dacb2/688a75b56c71954566c5dbba_HODLer%E2%80%99s%20Amulet_sd.png', description: 'Saldırı gücünü artırır.', type: 'attack_buff', value: 20 },
    { id: 'item2', name: 'Diversification Charm', imageUrl: 'https://cdn.prod.website-files.com/67fb1cd83af51c4fe96dacb2/688a75b58add36191a2c807d_Diversification%20Charm_sd2.png', description: 'Savunmayı artırır.', type: 'defense_buff', value: 15 },
    { id: 'item3', name: 'Heal Charm', imageUrl: 'https://cdn.prod.website-files.com/67fb1cd83af51c4fe96dacb2/688a75b5e94512a795b7ae5f_Heal%20Charm.png', description: 'Can yeniler.', type: 'heal', value: 30 },
    { id: 'item4', name: 'Whale Bond Earring', imageUrl: 'https://cdn.prod.website-files.com/67fb1cd83af51c4fe96dacb2/688a75b5fd1650ad69cdd29a_Whale%20Bond_earring_sd2.png', description: 'Kritik şansını artırır.', type: 'crit_buff', value: 0.15 },
    { id: 'item5', name: 'Risk Appetite Crystal', imageUrl: 'https://cdn.prod.website-files.com/67fb1cd83af51c4fe96dacb2/688a75b4df2713b76a0b1ee0_Risk%20Appetite%20Crystal_sd2.png', description: 'Buff süresini uzatır.', type: 'buff_duration', value: 1 }, // 1 tur uzatma
    { id: 'item6', name: 'Crystal Ring', imageUrl: 'https://cdn.prod.website-files.com/67fb1cd83af51c4fe96dacb2/688a75b45c3e668b21ef11a4_crystal_ring.png', description: 'Ekstra saldırı.', type: 'extra_attack', value: null },
    { id: 'item7', name: 'Berserker Charm', imageUrl: 'https://cdn.prod.website-files.com/67fb1cd83af51c4fe96dacb2/688a74a7259a73be40c12ee2_Berserker%20Charm4.png', description: 'Yüksek hasar, düşük savunma.', type: 'berserker_mode', value: null },
    { id: 'item8', name: 'Triangle Ring', imageUrl: 'https://cdn.prod.website-files.com/67fb1cd83af51c4fe96dacb2/688a74a77cfea9eb015db3d7_triangle_ring5.png', description: 'Dengeleyici etki.', type: 'balanced_effect', value: null }
];

// Karakter sınıfı tanımı
class Character {
    constructor(id, name, atk, def, initialHp, imageUrl, level, critChance) {
        this.id = id;
        this.name = name;
        this.baseAtk = atk;
        this.baseDef = def;
        this.currentHp = initialHp;
        this.imageUrl = imageUrl;
        this.level = level || 1;
        this.criticalChance = critChance || 0.2;
        this.buffActive = false;
        this.buffTurnsLeft = 0;
        this.buffAmount = 15;
        this.criticalMultiplier = 1.5;
        this.items = []; // Karakterin itemları için boş bir dizi (seçim sonrası doldurulacak)
        this.tempAtkBuff = 0; // Itemlardan gelen geçici saldırı buff'ı
        this.tempDefBuff = 0; // Itemlardan gelen geçici savunma buff'ı
        this.tempCritBuff = 0; // Itemlardan gelen geçici kritik şans buff'ı
    }

    toVisualHtml() {
        return `<img src="${this.imageUrl}" alt="${this.name} Image" class="rounded-lg" onerror="this.onerror=null;this.src='https://placehold.co/280x380/6c757d/FFFFFF?text=NFT+ERROR';">`;
    }

    toNameHtml() {
        return this.name;
    }

    get effectiveAtk() {
        return this.baseAtk + this.buffAmount + this.tempAtkBuff;
    }

    get effectiveDef() {
        return this.baseDef + this.tempDefBuff;
    }

    get effectiveCritChance() {
        return this.criticalChance + this.tempCritBuff;
    }

    applyBuff() {
        this.buffActive = true;
        this.buffTurnsLeft = 2; // Default 2 turns
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
}

// Oyuncu sınıfı tanımı
class Player {
    constructor(name, initialHp, level = 1, otherInfo = '', isAI = false, characterData) {
        this.name = name;
        this.level = level;
        this.otherInfo = otherInfo;
        this.isAI = isAI;
        this.character = new Character(characterData.id, characterData.name, characterData.atk, characterData.def, initialHp, characterData.imageUrl, characterData.level, characterData.critChance);
        this.selectedItems = []; // Oyuncunun seçtiği itemlar
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
let selectedItemsForBattle = []; // Oyuncunun savaş için seçtiği 6 item
const MAX_ITEM_SELECTION = 6;

// DOM elementleri
const gameContainer = document.getElementById('game-container');
const characterSelectionScreen = document.getElementById('character-selection-screen');
const displayWalletAddress = document.getElementById('displayWalletAddress');
const characterGrid = document.getElementById('character-grid');
const selectCharacterButton = document.getElementById('select-character-button');
const loadingNFTsMessage = document.getElementById('loading-nfts');

const itemSelectionScreen = document.getElementById('item-selection-screen'); // Yeni item seçim ekranı
const itemGrid = document.getElementById('item-grid');
const selectedItemCount = document.getElementById('selected-item-count');
const confirmItemsButton = document.getElementById('confirm-items-button');

const player1Bar = document.getElementById('player1-bar');
const player1Avatar = document.getElementById('player1-avatar');
const player1NameBar = document.getElementById('player1-name-bar');
const player1HpBarSmall = document.getElementById('player1-hp-bar-small');
const player1HpBarText = document.getElementById('player1-hp-bar-text');
const player1LevelBar = document.getElementById('player1-level-bar');
const player1AtkBar = document.getElementById('player1-atk-bar');
const player1DefBar = document.getElementById('player1-def-bar');
const player1CritBar = document.getElementById('player1-crit-bar');

const player2Area = document.getElementById('player2-area');
const player2HpBar = document.getElementById('player2-hp-bar');
const player2HpText = document.getElementById('player2-hp');
const player2CharacterCardVisualElement = document.getElementById('player2-character-card-visual');
const player2CharacterNameElement = document.getElementById('player2-character-name');
const player2CharacterStatsElement = document.getElementById('player2-character-stats');
const player2NameDisplay = document.getElementById('player2-name-display');

const gameMessagesElement = document.getElementById('game-messages');
const restartButton = document.getElementById('restart-button');
const itemSlotsContainer = document.getElementById('item-slots-container'); // Yeni item slot konteyneri

const battleIntroScreen = document.getElementById('battle-intro-screen');
const introPlayerCard = document.getElementById('intro-player-card');
const introPlayerName = document.getElementById('intro-player-name');
const mainGameContent = document.querySelector('.main-game-content');

// Airtable API bilgileri
const AIRTABLE_API_KEY = 'patNmkPQFkKD7rwMg.ad10006df9da05fea81089b46caab7f1629b474e88b8bf69d91269c58b50e211';
const AIRTABLE_BASE_ID = 'appBuciupEMutB7Z0';
const AIRTABLE_NFT_TABLE_NAME = 'nft_list';
const AIRTABLE_USER_TABLE_NAME = 'user_list';

// Airtable'dan NFT'leri çeken fonksiyon
async function fetchNFTsFromAirtable() {
    let url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_NFT_TABLE_NAME}`;
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
    } catch (error) {
        gameMessagesElement.textContent = `NFT'ler yüklenirken bir sorun oluştu: ${error.message}. Lütfen konsolu kontrol edin ve Airtable ayarlarınızı doğrulayın.`;
        console.error('fetchNFTsFromAirtable hatası:', error);
        return [];
    }
}

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
    if (nfts.length === 0) {
        characterGrid.innerHTML = '<p class="text-center text-red-400 col-span-full">Bu cüzdana ait NFT bulunamadı.</p>';
        selectCharacterButton.classList.add('disabled');
        selectCharacterButton.disabled = true;
        return;
    }
    nfts.forEach(nft => {
        const card = document.createElement('div');
        card.classList.add('character-selection-card');
        card.innerHTML = `
            <img src="${nft.imageUrl}" alt="${nft.name}" onerror="this.onerror=null;this.src='https://placehold.co/150x150/6c757d/FFFFFF?text=NFT+ERROR';">
            <h3>${nft.name}</h3>
            <p>ATK: ${nft.atk} | DEF: ${nft.def}</p>
            <p>LVL: ${nft.level} | CRIT: ${(nft.critChance * 100).toFixed(0)}%</p>
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
    if (playerWalletAddress) {
        const fetchedName = await fetchUserNameByWallet(playerWalletAddress);
        if (fetchedName) {
            player1Name = fetchedName;
        }
    }
    // Player1'i seçilen itemlarla oluştur
    player1 = new Player(player1Name, initialPlayerHp, selectedPlayerNFT.level, 'Siz', false, selectedPlayerNFT);
    player1.selectedItems = [...selectedItemsForBattle]; // Seçilen itemları atama

    currentBattleId = player1.character.id;

    let player2Name = "RAKİP";
    let player2CharacterData;

    if (opponentNFTs.length === 0) {
        gameMessagesElement.textContent = "Rakip NFT'ler bulunamadı. Lütfen daha sonra tekrar deneyin veya NFT listesini kontrol edin.";
        console.error("Hata: Rakip NFT'ler bulunamadı. Oyun başlatılamıyor.");
        itemSelectionScreen.style.display = 'none'; // Item seçim ekranını gizle
        characterSelectionScreen.style.display = 'flex'; // Karakter seçim ekranını tekrar göster
        return;
    }

    const player2CharIndex = Math.floor(Math.random() * opponentNFTs.length);
    player2CharacterData = opponentNFTs[player2CharIndex];
    if (player2CharacterData.wallet) {
        const fetchedOpponentName = await fetchUserNameByWallet(player2CharacterData.wallet);
        if (fetchedOpponentName) {
            player2Name = fetchedOpponentName;
        }
    }
    // Player2'yi rastgele itemlarla oluştur (veya boş bırak)
    // AI için de 6 rastgele item seçelim
    const aiItems = [];
    const availableItemsForAI = [...itemData]; // Tüm itemlardan kopyala
    for (let i = 0; i < MAX_ITEM_SELECTION; i++) {
        if (availableItemsForAI.length > 0) {
            const randomIndex = Math.floor(Math.random() * availableItemsForAI.length);
            aiItems.push(availableItemsForAI.splice(randomIndex, 1)[0]);
        } else {
            break; // Yeterli item kalmadıysa döngüyü kır
        }
    }
    player2 = new Player(player2Name, initialPlayerHp, player2CharacterData.level, 'Rakip', true, player2CharacterData);
    player2.selectedItems = aiItems; // Rakibe seçilen itemları ata

    currentPlayer = player1;
    gameActive = true;

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
    }, 3000);
}

// Kullanıcı arayüzünü güncelleyen fonksiyon
function updateUI() {
    // Oyuncu 1 (Sen) Barı Güncellemesi
    player1Avatar.src = player1.character.imageUrl;
    player1NameBar.textContent = player1.name;
    const p1Hp = (player1.character.currentHp / initialPlayerHp) * 100;
    player1HpBarSmall.style.width = `${Math.max(0, p1Hp)}%`;
    player1HpBarText.textContent = `${Math.max(0, player1.character.currentHp)} HP`;
    player1HpBarSmall.classList.toggle('low-hp', p1Hp <= 30); // Düşük HP'de kırmızıya dönme

    player1LevelBar.textContent = player1.character.level;
    player1AtkBar.textContent = player1.character.effectiveAtk;
    player1DefBar.textContent = player1.character.effectiveDef;
    player1CritBar.textContent = `${(player1.character.effectiveCritChance * 100).toFixed(0)}%`; // effectiveCritChance kullanıldı

    // Item slotlarını güncelle
    const itemSlots = document.querySelectorAll('.item-slot');
    itemSlots.forEach((slot, index) => {
        slot.innerHTML = ''; // Önceki içeriği temizle
        if (player1.selectedItems[index]) {
            const item = player1.selectedItems[index];
            slot.innerHTML = `<img src="${item.imageUrl}" alt="${item.name}" onerror="this.onerror=null;this.src='https://placehold.co/60x60/6c757d/FFFFFF?text=ITEM+ERROR';">`;
            slot.dataset.itemId = item.id; // Item ID'sini data attribute olarak kaydet
            slot.title = item.name + ": " + item.description; // Hover için açıklama
        } else {
            slot.dataset.itemId = ''; // Boş slot
            slot.title = 'Boş Slot';
        }
    });

    // Oyuncu 2 (Rakip) Alanı Güncellemesi
    player2NameDisplay.textContent = player2.name;
    const p2Hp = (player2.character.currentHp / initialPlayerHp) * 100;
    player2HpText.textContent = Math.max(0, player2.character.currentHp);
    player2HpBar.style.width = `${Math.max(0, p2Hp)}%`;
    player2HpBar.classList.toggle('low-hp', p2Hp <= 30);
    player2CharacterCardVisualElement.innerHTML = player2.character.toVisualHtml();
    player2CharacterNameElement.textContent = player2.character.toNameHtml();
    player2CharacterStatsElement.innerHTML = player2.character.toStatsHtml(player2.name, player2.level);

    // Oyuncu glow efektleri
    player1Bar.classList.toggle('current-player-glow', currentPlayer === player1); // Player1 barı için glow
    player2Area.classList.toggle('current-player-glow', currentPlayer === player2);

    if (gameActive && !currentPlayer.isAI) {
        enableItemSlots(); // Kendi sıramızda item slotlarını etkinleştir
    } else {
        disableItemSlots(); // Rakip sırası veya oyun bitince item slotlarını devre dışı bırak
    }
}

// Item slotlarını devre dışı bırakan fonksiyon
function disableItemSlots() {
    const itemSlots = document.querySelectorAll('.item-slot');
    itemSlots.forEach(slot => {
        slot.classList.add('disabled');
        slot.style.pointerEvents = 'none'; // Tıklamayı engelle
    });
}

// Item slotlarını etkinleştiren fonksiyon
function enableItemSlots() {
    const itemSlots = document.querySelectorAll('.item-slot');
    itemSlots.forEach(slot => {
        if (slot.dataset.itemId) { // Sadece dolu slotları etkinleştir
            slot.classList.remove('disabled');
            slot.style.pointerEvents = 'auto';
        }
    });
}

// Item kullanma işlemini yöneten fonksiyon
async function handleItemUse(itemId, slotElement) {
    if (!gameActive || turnActionTaken || currentPlayer !== player1) return; // Sadece oyuncu 1 kendi turunda item kullanabilir

    const usedItem = player1.selectedItems.find(item => item.id === itemId);
    if (!usedItem) {
        console.error('Kullanılan eşya bulunamadı:', itemId);
        return;
    }

    turnActionTaken = true;
    disableItemSlots(); // Item kullanıldıktan sonra slotları devre dışı bırak

    const playerCharacter = currentPlayer.character;
    const opponentCharacter = player2.character; // Rakip her zaman player2

    let message = `${player1.name}'in ${playerCharacter.name} "${usedItem.name}" eşyasını kullandı! `;

    // Item tipine göre etki
    switch (usedItem.type) {
        case 'attack_buff':
            playerCharacter.tempAtkBuff += usedItem.value;
            message += `Saldırı gücü ${usedItem.value} arttı.`;
            break;
        case 'defense_buff':
            playerCharacter.tempDefBuff += usedItem.value;
            message += `Savunma gücü ${usedItem.value} arttı.`;
            break;
        case 'heal':
            playerCharacter.currentHp = Math.min(initialPlayerHp, playerCharacter.currentHp + usedItem.value);
            message += `${usedItem.value} HP iyileşti.`;
            break;
        case 'crit_buff':
            playerCharacter.tempCritBuff += usedItem.value;
            message += `Kritik vuruş şansı %${(usedItem.value * 100).toFixed(0)} arttı.`;
            break;
        case 'buff_duration':
            if (playerCharacter.buffActive) {
                playerCharacter.buffTurnsLeft += usedItem.value;
                message += `Mevcut güçlenme süresi ${usedItem.value} tur uzadı.`;
            } else {
                message += `Şu anda aktif bir güçlenme yok, eşya kullanılamadı.`;
                turnActionTaken = false; // Item kullanılmadığı için tur eylemi geri alınır
                enableItemSlots(); // Butonları tekrar etkinleştir
                return;
            }
            break;
        case 'extra_attack':
            message += `Ekstra saldırı! `;
            // Ekstra saldırı mantığı
            let damage = Math.max(0, playerCharacter.effectiveAtk - opponentCharacter.effectiveDef);
            if (Math.random() < playerCharacter.effectiveCritChance) {
                damage = Math.round(damage * playerCharacter.criticalMultiplier);
                message += `KRİTİK VURUŞ! `;
            }
            opponentCharacter.currentHp -= damage;
            message += `${opponentCharacter.name}'e ${damage} hasar verdi.`;

            player2CharacterCardVisualElement.classList.add('hit');
            setTimeout(() => {
                player2CharacterCardVisualElement.classList.remove('hit');
            }, 900);
            break;
        case 'berserker_mode':
            // Örnek: Saldırı artar, savunma azalır
            playerCharacter.tempAtkBuff += 30;
            playerCharacter.tempDefBuff -= 10;
            message += `Berserker Modu aktif! Saldırı çok arttı, savunma azaldı.`;
            break;
        case 'balanced_effect':
            // Örnek: Hem saldırı hem savunma hafif artar
            playerCharacter.tempAtkBuff += 10;
            playerCharacter.tempDefBuff += 10;
            message += `Dengeleyici etki! Saldırı ve savunma arttı.`;
            break;
        default:
            message += `Bilinmeyen eşya tipi: ${usedItem.type}.`;
            break;
    }

    gameMessagesElement.textContent = message;

    // Kullanılan itemı envanterden kaldır
    const itemIndexInSelected = player1.selectedItems.findIndex(item => item.id === itemId);
    if (itemIndexInSelected > -1) {
        player1.selectedItems.splice(itemIndexInSelected, 1);
    }
    
    updateUI(); // UI'ı güncelle
    setTimeout(() => {
        if (!checkGameOver()) endTurn();
    }, 1000);
}

// Turu bitiren fonksiyon
function endTurn() {
    currentTurn++;
    // Geçici buffları sıfırla (eğer tek kullanımlıksa veya tur sonunda bitiyorsa)
    player1.character.tempAtkBuff = 0;
    player1.character.tempDefBuff = 0;
    player1.character.tempCritBuff = 0;

    player2.character.tempAtkBuff = 0; // Rakibin de geçici bufflarını sıfırla
    player2.character.tempDefBuff = 0;
    player2.character.tempCritBuff = 0;


    currentPlayer.character.decrementBuffTurn(); // Genel buff süresini azalt

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
        disableItemSlots(); // Oyun bitince item slotlarını devre dışı bırak
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
            const winnerVisualElement = (winnerPlayer === player1) ? player1Avatar : player2CharacterCardVisualElement;
            winnerVisualElement.classList.add('winner-animation');
            setTimeout(() => {
                winnerVisualElement.classList.remove('winner-animation');
            }, 2000);
        }

        sendBattleResultToWebhook(winner, player1.character.id);
        return true;
    }
    return false;
}

// Yapay zeka turunu yöneten fonksiyon
function aiTurn() {
    // AI'nın kullanabileceği itemları filtrele
    const usableItems = currentPlayer.selectedItems.filter(item => {
        // Canı azsa ve iyileştirme itemı varsa
        if (item.type === 'heal' && currentPlayer.character.currentHp < initialPlayerHp * 0.4) {
            return true;
        }
        // Buff aktifse ve buff süresi uzatma itemı varsa
        if (item.type === 'buff_duration' && currentPlayer.character.buffActive) {
            return true;
        }
        // Saldırı buff'ı veya ekstra saldırı itemı her zaman kullanılabilir
        if (item.type === 'attack_buff' || item.type === 'extra_attack' || item.type === 'berserker_mode' || item.type === 'balanced_effect') {
            return true;
        }
        // Diğer item tipleri için AI stratejisi eklenebilir
        return false;
    });

    if (usableItems.length > 0) {
        // En uygun itemı seçmeye çalış (basit bir strateji)
        let itemToUse = null;
        // 1. Canı azsa iyileşme
        itemToUse = usableItems.find(item => item.type === 'heal' && currentPlayer.character.currentHp < initialPlayerHp * 0.4);
        if (itemToUse) {
            handleItemUseForAI(itemToUse.id);
            return;
        }
        // 2. Buff aktifse buff süresi uzatma
        itemToUse = usableItems.find(item => item.type === 'buff_duration' && currentPlayer.character.buffActive);
        if (itemToUse) {
            handleItemUseForAI(itemToUse.id);
            return;
        }
        // 3. Saldırı buff'ı veya ekstra saldırı
        itemToUse = usableItems.find(item => item.type === 'attack_buff' || item.type === 'extra_attack' || item.type === 'berserker_mode');
        if (itemToUse) {
            handleItemUseForAI(itemToUse.id);
            return;
        }
        // 4. Kalan diğer itemlar
        itemToUse = usableItems[Math.floor(Math.random() * usableItems.length)];
        handleItemUseForAI(itemToUse.id);
    } else {
        // Hiç uygun item yoksa veya itemlar bittiyse, varsayılan bir saldırı yap
        // Bu durumda AI'nın "saldırı" itemı simüle edilebilir veya doğrudan hasar verilebilir.
        // Şimdilik, doğrudan hasar verme mantığını burada uygulayalım.
        turnActionTaken = true; // AI'nın turu bitti
        const attacker = currentPlayer.character;
        const defender = (currentPlayer === player1) ? player2.character : player1.character;

        let damage = Math.max(0, attacker.effectiveAtk - defender.effectiveDef);
        let message = `${currentPlayer.name}'in ${attacker.name} saldırdı! `;
        if (Math.random() < attacker.effectiveCritChance) {
            damage = Math.round(damage * attacker.criticalMultiplier);
            message += `KRİTİK VURUŞ! `;
        }
        defender.currentHp -= damage;
        message += `${defender.name}'e ${damage} hasar verdi.`;
        gameMessagesElement.textContent = message;

        const defenderVisualElement = (currentPlayer === player1) ? player2CharacterCardVisualElement : player1CharacterCardVisualElement;
        defenderVisualElement.classList.add('hit');
        setTimeout(() => {
            defenderVisualElement.classList.remove('hit');
        }, 900);

        updateUI();
        setTimeout(() => {
            if (!checkGameOver()) endTurn();
        }, 1000);
    }
}

// AI'nın item kullanma fonksiyonu (handleItemUse'dan farklı olarak, AI'nın kendi item listesini kullanır)
async function handleItemUseForAI(itemId) {
    const usedItem = currentPlayer.selectedItems.find(item => item.id === itemId);
    if (!usedItem) {
        console.error('AI tarafından kullanılacak eşya bulunamadı:', itemId);
        return;
    }

    turnActionTaken = true; // AI'nın tur eylemini işaretle

    const playerCharacter = currentPlayer.character;
    const opponentCharacter = (currentPlayer === player1) ? player2.character : player1.character;

    let message = `${currentPlayer.name}'in ${playerCharacter.name} "${usedItem.name}" eşyasını kullandı! `;

    switch (usedItem.type) {
        case 'attack_buff':
            playerCharacter.tempAtkBuff += usedItem.value;
            message += `Saldırı gücü ${usedItem.value} arttı.`;
            break;
        case 'defense_buff':
            playerCharacter.tempDefBuff += usedItem.value;
            message += `Savunma gücü ${usedItem.value} arttı.`;
            break;
        case 'heal':
            playerCharacter.currentHp = Math.min(initialPlayerHp, playerCharacter.currentHp + usedItem.value);
            message += `${usedItem.value} HP iyileşti.`;
            break;
        case 'crit_buff':
            playerCharacter.tempCritBuff += usedItem.value;
            message += `Kritik vuruş şansı %${(usedItem.value * 100).toFixed(0)} arttı.`;
            break;
        case 'buff_duration':
            if (playerCharacter.buffActive) {
                playerCharacter.buffTurnsLeft += usedItem.value;
                message += `Mevcut güçlenme süresi ${usedItem.value} tur uzadı.`;
            } else {
                message += `Şu anda aktif bir güçlenme yok, eşya kullanılamadı.`;
                turnActionTaken = false; // Item kullanılmadığı için tur eylemi geri alınır
                // AI'nın tekrar denemesi için buraya bir mekanizma eklenebilir
                return;
            }
            break;
        case 'extra_attack':
            message += `Ekstra saldırı! `;
            let damage = Math.max(0, playerCharacter.effectiveAtk - opponentCharacter.effectiveDef);
            if (Math.random() < playerCharacter.effectiveCritChance) {
                damage = Math.round(damage * playerCharacter.criticalMultiplier);
                message += `KRİTİK VURUŞ! `;
            }
            opponentCharacter.currentHp -= damage;
            message += `${opponentCharacter.name}'e ${damage} hasar verdi.`;

            const defenderVisualElement = (currentPlayer === player1) ? player2CharacterCardVisualElement : player1CharacterCardVisualElement;
            defenderVisualElement.classList.add('hit');
            setTimeout(() => {
                defenderVisualElement.classList.remove('hit');
            }, 900);
            break;
        case 'berserker_mode':
            playerCharacter.tempAtkBuff += 30;
            playerCharacter.tempDefBuff -= 10;
            message += `Berserker Modu aktif! Saldırı çok arttı, savunma azaldı.`;
            break;
        case 'balanced_effect':
            playerCharacter.tempAtkBuff += 10;
            playerCharacter.tempDefBuff += 10;
            message += `Dengeleyici etki! Saldırı ve savunma arttı.`;
            break;
        default:
            message += `Bilinmeyen eşya tipi: ${usedItem.type}.`;
            break;
    }

    gameMessagesElement.textContent = message;

    // Kullanılan itemı AI'nın envanterinden kaldır
    const itemIndexInSelected = currentPlayer.selectedItems.findIndex(item => item.id === itemId);
    if (itemIndexInSelected > -1) {
        currentPlayer.selectedItems.splice(itemIndexInSelected, 1);
    }
    
    updateUI();
    setTimeout(() => {
        if (!checkGameOver()) endTurn();
    }, 1000);
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
            level: player1.character.level,
            isAI: player1.isAI,
            selectedItems: player1.selectedItems.map(item => item.id) // Seçilen item ID'lerini gönder
        },
        player2: {
            name: player2.name,
            character: player2.character.name,
            finalHp: Math.max(0, player2.character.currentHp),
            level: player2.character.level,
            isAI: player2.isAI,
            selectedItems: player2.selectedItems.map(item => item.id) // Rakibin seçilen item ID'lerini gönder
        },
        totalTurns: currentTurn,
        winner: winner
    };

    console.log('Sending payload to webhook:', payload); 

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
});
