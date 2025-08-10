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
    constructor(id, name, atk, def, initialHp, imageUrl, level, critChance) { // Level ve critChance eklendi
        this.id = id;
        this.name = name;
        this.baseAtk = atk;
        this.baseDef = def;
        this.currentHp = initialHp;
        this.imageUrl = imageUrl;
        this.level = level || 1; // Varsayılan level 1
        this.criticalChance = critChance || 0.2; // Varsayılan kritik vuruş şansı
        this.buffActive = false; // Buff aktif mi
        this.buffTurnsLeft = 0; // Buff kaç tur sürecek
        this.buffAmount = 15; // Buff ile artan saldırı gücü
        this.criticalMultiplier = 1.5; // Kritik vuruş çarpanı
        this.items = []; // Karakterin itemları için boş bir dizi
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

    // Karakterin istatistik HTML'ini döndürür (eski kart görünümü için)
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
    constructor(name, initialHp, level = 1, otherInfo = '', isAI = false, characterData, items = []) { // items parametresi eklendi
        this.name = name;
        this.level = level;
        this.otherInfo = otherInfo;
        this.isAI = isAI;
        // Character sınıfına level ve critChance parametreleri eklendi
        this.character = new Character(characterData.id, characterData.name, characterData.atk, characterData.def, initialHp, characterData.imageUrl, characterData.level, characterData.critChance);
        this.character.items = items; // Karakterin itemlarını ata
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

// Oyuncu 1 (Sen) Barı elementleri
const player1Bar = document.getElementById('player1-bar');
const player1Avatar = document.getElementById('player1-avatar');
const player1NameBar = document.getElementById('player1-name-bar');
const player1HpBarSmall = document.getElementById('player1-hp-bar-small');
const player1HpBarText = document.getElementById('player1-hp-bar-text');
const player1LevelBar = document.getElementById('player1-level-bar');
const player1AtkBar = document.getElementById('player1-atk-bar');
const player1DefBar = document.getElementById('player1-def-bar');
const player1CritBar = document.getElementById('player1-crit-bar');
const player1ItemsBar = document.getElementById('player1-items-bar'); // Yeni item barı elementi

// Oyuncu 1 (Sen) Alanı - Bu kısım gizlendiği için güncellenmeyecek, sadece referans olarak duruyor
const player1Area = document.getElementById('player1-area');
const player1HpBar = document.getElementById('player1-hp-bar'); // Eski büyük can barı
const player1HpText = document.getElementById('player1-hp'); // Eski büyük can text
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
// Airtable API bilgileri
const AIRTABLE_API_KEY = 'patHY39bvGqiBVDCN.0aee00fc9c3dff8b8d0aa9bd60fbc925efe5eda81b447ea7cf9d75216a3faa70.ad10006df9da05fea81089b46caab7f1629b474e88b8bf69d91269c58b50e211';
const AIRTABLE_BASE_ID = 'patHY39bvGqiBVDCN';

const AIRTABLE_NFT_TABLE_NAME = 'nft_list';
const AIRTABLE_USER_TABLE_NAME = 'user_list';

// Airtable'dan NFT'leri çeken fonksiyon
// Bu fonksiyon artık tüm NFT'leri çeker, cüzdan filtresi burada uygulanmaz
async function fetchNFTsFromAirtable() { // walletAddress parametresi kaldırıldı
    let url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_NFT_TABLE_NAME}`;
    // console.log('Airtable API URL (constructed - tüm NFTler için):', url); // Debug: Oluşturulan Airtable URL'ini logla
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
        // console.log('Airtable API Raw Response (tüm NFTler):', data); // Debug: Airtable'dan gelen ham yanıtı logla
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
                level: record.fields.level || 1, // Level bilgisini ekle
                critChance: record.fields.crit_chance || 0.2, // Crit Chance bilgisini ekle
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
        console.error('fetchNFTsFromAirtable hatası:', error); // Hata detayını konsola yaz
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

    // Her zaman karakter seçim ekranını göster
    gameContainer.style.display = 'none'; // Oyun konteynerinin gizli olduğundan emin ol
    characterSelectionScreen.style.display = 'flex'; // Karakter seçim ekranını görünür yap
    characterGrid.innerHTML = ''; // Önceki kartları temizle
    selectCharacterButton.classList.add('disabled');
    selectCharacterButton.disabled = true;
    restartButton.classList.add('hidden');
    attackButton.classList.add('hidden');
    buffButton.classList.add('hidden');
    disableActionButtons();

    // Cüzdan adresi henüz alınmadıysa, bekleme mesajını göster ve geri dön
    if (!playerWalletAddress) {
        displayWalletAddress.textContent = 'Cüzdan bekleniyor...';
        loadingNFTsMessage.style.display = 'block'; // Yükleme mesajını göster
        loadingNFTsMessage.textContent = 'Cüzdan bilgisi bekleniyor...';
        // console.log('Cüzdan adresi henüz alınmadı, initializeGame bekleniyor.'); // Debug log
        return; // postMessage dinleyicisi tarafından tekrar çağrılacak
    }

    // Cüzdan adresi mevcutsa, NFT'leri çekmeye başla
    // console.log('Cüzdan adresi alındı:', playerWalletAddress, 'NFT\'ler yükleniyor...'); // Debug log
    setTimeout(async () => {
        allFetchedNFTs = await fetchNFTsFromAirtable(); // Tüm NFT'leri cüzdan filtresi olmadan çek

        // Cüzdan adreslerini normalleştirerek filtrele
        const cleanedPlayerWalletAddress = playerWalletAddress ? playerWalletAddress.toLowerCase().trim() : null;
        const playerNFTs = allFetchedNFTs.filter(nft => nft.wallet && nft.wallet.toLowerCase().trim() === cleanedPlayerWalletAddress);
        opponentNFTs = allFetchedNFTs.filter(nft => nft.wallet && nft.wallet.toLowerCase().trim() !== cleanedPlayerWalletAddress);

        displayWalletAddress.textContent = maskWalletAddress(playerWalletAddress || 'Bulunamadı');
        loadingNFTsMessage.textContent = 'NFT\'ler yükleniyor...'; // NFT yükleme mesajını güncelle

        if (playerNFTs.length > 0) {
            displayNFTsForSelection(playerNFTs);
            // console.log('Oyuncu NFTleri yüklendi:', playerNFTs.length); // Debug log
        } else {
            characterGrid.innerHTML = '<p class="text-center text-red-400 col-span-full">Bu cüzdana ait NFT bulunamadı veya bir hata oluştu. NFT Doğrulaması yapmadıysanız Venus Bot aracılığıyla doğrulama talebi göndermek için Görevler sayfasını inceleyin.</p>';
            console.warn('Oyuncu NFTleri bulunamadı veya yüklendiğinde boş geldi.'); // Debug log
        }
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
            <p>LVL: ${nft.level} | CRIT: ${(nft.critChance * 100).toFixed(0)}%</p>
        `;
        card.addEventListener('click', () => selectNFT(nft, card));
        characterGrid.appendChild(card);
    });
}

// NFT seçme fonksiyonu
function selectNFT(nft, cardElement) {
    // console.log('NFT seçildi:', nft.name); // Debug: Hangi NFT seçildiğini logla
    const previouslySelected = document.querySelector('.character-selection-card.selected');
    if (previouslySelected) previouslySelected.classList.remove('selected');
    cardElement.classList.add('selected');
    selectedPlayerNFT = nft;
    selectCharacterButton.classList.remove('disabled');
    selectCharacterButton.disabled = false;
    // console.log('Seç karakter butonu etkinleştirildi. disabled:', selectCharacterButton.disabled); // Debug: Butonun etkinleştirildiğini logla
}

// Seçilen NFT ile oyunu başlatma
async function startGameWithSelectedNFT() {
    // console.log('startGameWithSelectedNFT fonksiyonu çağrıldı.'); // Debug: Fonksiyonun çağrıldığını logla
    // console.log('selectedPlayerNFT değeri:', selectedPlayerNFT); // Debug: selectedPlayerNFT değerini logla

    if (!selectedPlayerNFT) {
        gameMessagesElement.textContent = "Lütfen bir karakter seçin!";
        console.error("Hata: Karakter seçilmedi. Savaş başlatılamıyor."); // Debug: Hata mesajı
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
    // Player sınıfına level ve critChance bilgileri CharacterData üzerinden geçiriliyor
    // selectedPlayerNFT.items'ı Player constructor'ına ekledik
    player1 = new Player(player1Name, initialPlayerHp, selectedPlayerNFT.level, 'Siz', false, selectedPlayerNFT, selectedPlayerNFT.items);
    currentBattleId = player1.character.id; // Battle ID'nin player1'in karakter ID'si olduğundan emin olalım

    let player2Name = "RAKİP";
    let player2CharacterData;

    if (opponentNFTs.length === 0) {
        gameMessagesElement.textContent = "Rakip NFT'ler bulunamadı. Lütfen daha sonra tekrar deneyin veya NFT listesini kontrol edin.";
        console.error("Hata: Rakip NFT'ler bulunamadı. Oyun başlatılamıyor.");
        characterSelectionScreen.style.display = 'flex'; // Karakter seçim ekranını tekrar göster
        gameContainer.style.display = 'none'; // Oyun konteynerini gizle
        return; // Oyunun başlamasını engelle
    }

    // Rakip NFT'lerinden rastgele birını seç
    const player2CharIndex = Math.floor(Math.random() * opponentNFTs.length);
    player2CharacterData = opponentNFTs[player2CharIndex];
    if (player2CharacterData.wallet) {
        const fetchedOpponentName = await fetchUserNameByWallet(player2CharacterData.wallet);
        if (fetchedOpponentName) {
            player2Name = fetchedOpponentName;
        }
    }
    
    // Player sınıfına level ve critChance bilgileri CharacterData üzerinden geçiriliyor
    // player2CharacterData.items'ı Player constructor'ına ekledik
    player2 = new Player(player2Name, initialPlayerHp, player2CharacterData.level, 'Rakip', true, player2CharacterData, player2CharacterData.items);

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
    // Oyuncu 1 (Sen) Barı Güncellemesi
    player1Avatar.src = player1.character.imageUrl;
    player1NameBar.textContent = player1.name;
    const p1Hp = (player1.character.currentHp / initialPlayerHp) * 100;
    player1HpBarSmall.style.width = `${Math.max(0, p1Hp)}%`;
    player1HpBarText.textContent = `${Math.max(0, player1.character.currentHp)} HP`;
    // Düşük HP'de kırmızıya dönme
    player1HpBarSmall.classList.toggle('low-hp', p1Hp <= 30);

    player1LevelBar.textContent = player1.character.level;
    player1AtkBar.textContent = player1.character.effectiveAtk;
    player1DefBar.textContent = player1.character.effectiveDef;
    player1CritBar.textContent = `${(player1.character.criticalChance * 100).toFixed(0)}%`;

    // Item ikonlarını güncelle
    player1ItemsBar.innerHTML = ''; // Mevcut itemları temizle
    // player1.character.items dizisi boşsa veya tanımsızsa, varsayılan ikonları göster
    const itemsToDisplay = player1.character.items && player1.character.items.length > 0 ? player1.character.items : [
        { icon: '⚡' },
        { icon: '🛡️' },
        { icon: '💊' }
    ];

    itemsToDisplay.forEach(item => {
        const itemIconDiv = document.createElement('div');
        itemIconDiv.classList.add('player-bar-item-icon');
        itemIconDiv.textContent = item.icon; // Item objesinde 'icon' özelliği olduğunu varsayıyoruz
        player1ItemsBar.appendChild(itemIconDiv);
    });


    // Oyuncu 2 (Rakip) Alanı Güncellemesi (eski kart görünümü)
    player2NameDisplay.textContent = player2.name;
    const p2Hp = (player2.character.currentHp / initialPlayerHp) * 100;
    player2HpText.textContent = Math.max(0, player2.character.currentHp);
    player2HpBar.style.width = `${Math.max(0, p2Hp)}%`;
    player2HpBar.classList.toggle('low-hp', p2Hp <= 30);
    player2CharacterCardVisualElement.innerHTML = player2.character.toVisualHtml();
    player2CharacterNameElement.textContent = player2.character.toNameHtml();
    player2CharacterStatsElement.innerHTML = player2.character.toStatsHtml(player2.name, player2.level);

    // Oyuncu glow efektleri (hala rakip kartında aktif olacak)
    // Oyuncu 1'in büyük kart alanı gizlendiği için bu kısım artık sadece player2Area için geçerli.
    // Ancak, currentPlayer'ın player1 olup olmadığını kontrol ederek yine de doğru şekilde çalışır.
    player1Area.classList.toggle('current-player-glow', currentPlayer === player1); // Bu satır artık görünür bir etki yaratmayacak
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
    const defenderVisualElement = (currentPlayer === player1) ? player2CharacterCardVisualElement : player1CharacterCardVisualElement; // Rakip kart görseli
    const attackerVisualElement = (currentPlayer === player1) ? player1Avatar : player2CharacterCardVisualElement; // Saldıranın görseli (player1 için avatar, player2 için kart)

    // Saldıranın görseline animasyon ekle
    if (currentPlayer === player1) {
        // Player 1 için avatarın kendisi sallanabilir veya başka bir efekt eklenebilir
        player1Avatar.style.transform = 'scale(1.1)';
        player1Avatar.style.transition = 'transform 0.2s ease-in-out';
        setTimeout(() => {
            player1Avatar.style.transform = 'scale(1)';
        }, 200);
    } else {
        attackerVisualElement.classList.add('attacking');
        setTimeout(() => {
            attackerVisualElement.classList.remove('attacking');
        }, 800);
    }


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
    const playerVisualElement = (currentPlayer === player1) ? player1Avatar : player2CharacterCardVisualElement; // Bufflanan görseli (player1 için avatar, player2 için kart)

    playerCharacter.applyBuff();
    gameMessagesElement.textContent = `${currentPlayer.name}'in ${playerCharacter.name} güçlendi! Saldırı gücü ${playerCharacter.buffTurnsLeft} tur boyunca arttı.`;

    // Buff animasyonunu uygulayın
    if (currentPlayer === player1) {
        // Player 1 için avatarın kendisi parlayabilir veya başka bir efekt eklenebilir
        player1Avatar.style.boxShadow = '0 0 20px rgba(0, 255, 65, 0.6)';
        player1Avatar.style.transition = 'box-shadow 0.5s ease-in-out';
        setTimeout(() => {
            player1Avatar.style.boxShadow = 'none';
        }, 1500);
    } else {
        playerVisualElement.classList.add('buffed-animation');
        setTimeout(() => {
            playerVisualElement.classList.remove('buffed-animation');
        }, 1500);
    }

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
            // Kazanan oyuncu player1 ise avatarını, player2 ise kartını hedefle
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
            level: player1.character.level, // Character'dan level al
            isAI: player1.isAI
        },
        player2: {
            name: player2.name,
            character: player2.character.name,
            finalHp: Math.max(0, player2.character.currentHp),
            level: player2.character.level, // Character'dan level al
            isAI: player2.isAI
        },
        totalTurns: currentTurn,
        winner: winner
    };

    // Make.com'a gönderilecek payload'ı konsola yazdırıyoruz.
    // Bu, Make.com'a giden verinin içeriğini kontrol etmenizi sağlar.
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
            console.log('Battle results sent to webhook successfully!'); // Bu logu bırakıyoruz, başarılı gönderimi gösteriyor
        }
    } catch (error) {
        console.error('Error sending battle results to webhook:', error);
    }
}

// postMessage ile cüzdan adresini dinle
window.addEventListener('message', async (event) => {
    // console.log('iframe içinde mesaj alındı. Origin:', event.origin, 'Data:', event.data); // Debug logu kaldırıldı

    // Güvenlik: Mesajın beklenen kaynaktan geldiğini doğrulayın
    const allowedOrigins = [
        'https://cryptoyogi.webflow.io',
        'https://www.cryptoyogi.com',
        'https://yagizcanmutlu.github.io',
        'https://www.cryptoyogi.world'
    ];

    // console.log('Kontrol edilen Origin:', event.origin); // Debug logu kaldırıldı
    // console.log('İzin verilen Origins:', allowedOrigins); // Debug logu kaldırıldı

    if (!allowedOrigins.includes(event.origin)) {
        console.warn('Güvenlik uyarısı: Bilinmeyen kaynaktan mesaj alındı!', event.origin);
        return;
    }

    if (event.data && event.data.type === 'walletAddress') {
        playerWalletAddress = event.data.address;
        // console.log('postMessage ile alınan cüzdan adresi:', playerWalletAddress); // Cüzdan adresi logu kaldırıldı
        // Cüzdan adresi alındıktan sonra oyunu başlat
        initializeGame();
    }
});

// Oyun butonları için olay dinleyicileri
// Bu dinleyiciler, iframe içindeki butonlara bağlanır
selectCharacterButton.addEventListener('click', startGameWithSelectedNFT);
attackButton.addEventListener('click', handleAttack);
buffButton.addEventListener('click', handleBuff);
restartButton.addEventListener('click', initializeGame);

