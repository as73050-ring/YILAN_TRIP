// 第一次沒有資料時，用這份當初始內容寫入 Google Sheet。
// 之後 Google Sheet 就是唯一真相來源，改這個檔案不會再影響已經部署的頁面。
var SEED_DATA = {
  info: {
    lodging: {
      title: "山杉青旅 Hostel Sasa",
      sub: "宜蘭縣礁溪鄉十六結路103之37號・不含早餐，Day2 另排礁溪早餐店",
      rows: [["入住", "10/17（三）"], ["退房", "10/18（四）早上"]],
      mapQuery: "山杉青旅 礁溪"
    },
    transport: {
      title: "重機／開車・視天氣",
      sub: "10/17 陣雨機率 50%，建議起床先看雷達圖再決定；雨天優先開車。",
      rows: [["路線", "國5雪隧／北宜公路"], ["車程", "約 1.5–2 hr"]]
    }
  },
  weather: [
    { day: "10/17（三）", icon: "🌧️", temp: "29°C", note: "陣雨・降雨機率 50%" },
    { day: "10/18（四）", icon: "⛅", temp: "30°C", note: "多雲時晴・降雨機率 24%" }
  ],
  days: {
    day1: {
      label: "Day 1 — 上路到夜景",
      tag: "10/17（三）・陣雨機率高",
      stops: [
        { id: "s_d1_1", time: "早上", name: "台北 → 礁溪", badge: "視天氣", badgeType: "plan",
          note: "陣雨機率 50%，建議起床先看一次即時雷達圖：若有雨區覆蓋北宜/雪隧，優先改開車；放晴空檔才騎重機，雨衣雨鞋還是帶著。",
          address: "", durationMin: null, extra: ["⏱️ 約 1.5–2 hr", "🛣️ 國5 雪隧 or 北宜公路"] },
        { id: "s_d1_2", time: "12:30", name: "流水森林餐廳", badge: "午餐・泡腳", badgeType: "normal",
          note: "頭城山邊溪谷旁的半露天餐廳，邊吃蛤蜊義大利麵邊泡腳消暑，順路安排在進礁溪之前。用餐限時 100 分，每人低消一品，假日建議先電話卡位。",
          address: "宜蘭縣頭城鎮宜三路二段275巷7之1號", durationMin: 90, extra: ["🕒 11:00–20:30", "📞 0916-984480"] },
        { id: "s_d1_3", time: "14:00", name: "抵達礁溪・寄放行李", badge: "", badgeType: "normal",
          note: "到山杉青旅放行李，附近散步消化一下，順道留點胃口給路邊的礁溪香腸伯。",
          address: "宜蘭縣礁溪鄉十六結路103之37號", durationMin: 20, extra: [] },
        { id: "s_d1_4", time: "15:00", name: "礁溪香腸伯", badge: "路邊點心", badgeType: "plan",
          note: "跑馬古道口旁近 30 年老攤，潤餅皮包大腸包小腸是招牌。假日常排隊，陣雨天攤位可能提早收，建議先電話確認還有沒有開。",
          address: "宜蘭縣礁溪鄉五峰路・跑馬古道口旁", durationMin: 30, extra: ["🕒 10:00–18:00", "📞 0927-066196"] },
        { id: "s_d1_5", time: "16:00", name: "搭接駁車上山・空ㄟ農場", badge: "空ㄟ農場", badgeType: "alt",
          note: "礁溪白石腳山區的夜景餐廳，開車/重機無法直接上山，需在山下定點搭免費接駁車。現場候位不預約，用餐限時 2 小時，<b>只收現金</b>，低消 $300/人。趁天色還亮時先上山排候位，等天黑看蘭陽平原夜景＋吃窯烤 Pizza。",
          address: "宜蘭縣礁溪鄉白雲村白石腳路157巷31號", durationMin: 120, extra: ["🕒 週三 15:00–23:00", "💰 低消 $300/人＋10%"] },
        { id: "s_d1_6", time: "晚上", name: "下山回山杉青旅休息", badge: "", badgeType: "normal",
          note: "搭接駁車下山，回礁溪住宿洗溫泉好好睡，為明天的狐狸行程儲備體力。",
          address: "", durationMin: null, extra: [] }
      ]
    },
    day2: {
      label: "Day 2 — 看狐狸、吃回台北",
      tag: "10/18（四）・多雲時晴",
      stops: [
        { id: "s_d2_1", time: "08:00", name: "山越早點", badge: "簡單吃", badgeType: "normal",
          note: "青旅沒附早餐，先在礁溪吃點在地早餐墊胃再上路。蛋餅、鍋貼、飯糰都有，吃完直接退房出發。",
          address: "宜蘭縣礁溪鄉礁溪路", durationMin: 30, extra: ["🕒 06:00–13:00（週四公休）"] },
        { id: "s_d2_2", time: "08:40", name: "退房，礁溪 → 三星", badge: "", badgeType: "normal",
          note: "吃完早餐退房，開車/騎車往三星鄉，車程約 25–30 分。天氣轉好，戶外行程都可以放心排。",
          address: "", durationMin: null, extra: ["⏱️ 約 25–30 min"] },
        { id: "s_d2_3", time: "09:30", name: "宜蘭狐狸村（九九峰動物樂園）", badge: "看狐狸", badgeType: "alt",
          note: "白狐、赤狐都在這裡零距離互動，還有土撥鼠、鵜鶘餵食、樹懶餐廳，親子跟大人都好拍。全年無休，開園後直接進場，不用搶場次。",
          address: "宜蘭縣三星鄉萬富七路76號", durationMin: 150, extra: ["🕒 09:00–17:30", "🎫 全票$350／2–4歲$100／65+$250"] },
        { id: "s_d2_4", time: "12:00", name: "林場肉羹", badge: "在地午餐", badgeType: "normal",
          note: "羅東超過 50 年的在地老店，就在羅東林業文化園區旁，肉羹麵／羹湯／肉羹飯都銅板價，吃完直接散步去隔壁園區逛逛。",
          address: "宜蘭縣羅東鎮中正北路109號", durationMin: 50, extra: ["🕒 07:00–17:30（週三公休）", "📞 03-9552736"] },
        { id: "s_d2_5", time: "13:00", name: "羅東林業文化園區", badge: "散步逛逛", badgeType: "normal",
          note: "日式老屋、舊鐵道、貯木池都保留下來，免門票、有遮蔭好散步，吃飽飯消化剛好，旁邊走到羅東文化工場也不遠。",
          address: "宜蘭縣羅東鎮中正北路118號", durationMin: 60, extra: ["🕒 戶外全天開放"] },
        { id: "s_d2_6", time: "14:30", name: "羅東甜點・路過三選一", badge: "彈性", badgeType: "plan",
          note: "三家都在羅東市區、彼此距離很近，看當下想吃什麼挑一家就好，不用都跑：<b>福鼎冰淇淋廠</b>吃手工冰、<b>NiNôo Café</b>坐下來喝咖啡、<b>玉圓堂</b>外帶一杯黑糖粉圓鮮奶上路。",
          address: "宜蘭縣羅東鎮光榮路230巷80號", durationMin: 40, extra: [] },
        { id: "s_d2_7", time: "15:00", name: "Gather 食聚咖啡", badge: "下午茶收尾", badgeType: "alt",
          note: "宜蘭最知名的水果千層蛋糕，2025年底搬到員山新店面，停車比舊址方便。從羅東過去約 15–20 分，當作這趟唯一的正式下午茶。",
          address: "宜蘭縣員山鄉尚深路60巷29號", durationMin: 60, extra: ["🕒 10:00–17:00（週一二公休）", "📞 03-9385868"] },
        { id: "s_d2_8", time: "16:15", name: "Allin_roll 生乳捲", badge: "最後一站・伴手禮", badgeType: "plan",
          note: "放在最後拿，當伴手禮保冷時間最短、直接帶上車回台北。<b>只能私訊 IG 預約再現場取貨</b>，記得提早幾天先敲好時間。從員山繞回羅東約 15–20 分，是這天唯一的小繞路，拿完直接上路。",
          address: "宜蘭縣羅東鎮天津路52號2樓", durationMin: 15, extra: ["🕒 取貨 14:00–21:00（需先預約）"] },
        { id: "s_d2_9", time: "17:00", name: "踏上歸途", badge: "", badgeType: "normal",
          note: "羅東上國5／雪隧方向都不遠，拿完生乳捲就可以直接出發回台北，避開太晚的山路夜騎。",
          address: "", durationMin: null, extra: [] }
      ]
    }
  },
  note: {
    title: "給重機/開車的小提醒",
    items: [
      "17 日降雨機率 50%，出發前務必再看一次即時雷達圖，雨天建議改開車；行李先備好雨衣雨鞋。",
      "空ㄟ農場只收現金、不能自行開車上山，記得先備零錢和留時間候位。",
      "礁溪香腸伯是路邊攤，雨天可能提早收攤，建議先電話確認。",
      "Allin_roll 生乳捲要先私訊 IG 預約，沒預約可能撲空，記得出發前幾天就先敲時間。"
    ]
  },
  checklist: [
    { id: "c1", label: "確認山杉青旅訂房", note: "Email / 訂房平台截圖存好", checked: false },
    { id: "c2", label: "Allin_roll 生乳捲已私訊 IG 預約取貨時間", note: "", checked: false },
    { id: "c3", label: "準備足夠現金", note: "空ㄟ農場只收現金，低消 $300/人", checked: false },
    { id: "c4", label: "雨衣、雨鞋（重機用）", note: "", checked: false },
    { id: "c5", label: "安全帽、手套、防風鏡片", note: "", checked: false },
    { id: "c6", label: "行動電源、車充線", note: "", checked: false },
    { id: "c7", label: "駕照、行照、強制險影本", note: "", checked: false },
    { id: "c8", label: "防曬乳、個人藥品", note: "", checked: false },
    { id: "c9", label: "確認 10/17 即時天氣雷達圖，決定騎車或開車", note: "", checked: false }
  ],
  packing: [
    { id: "docs", name: "證件財物", color: "#b65a3a", items: [
      { id: "docs-0", label: "駕照 / 行照", checked: false },
      { id: "docs-1", label: "強制險影本", checked: false },
      { id: "docs-2", label: "身分證", checked: false },
      { id: "docs-3", label: "現金（空ㄟ農場用）", checked: false },
      { id: "docs-4", label: "信用卡", checked: false }
    ]},
    { id: "riding", name: "騎乘裝備", color: "#2f5a53", items: [
      { id: "riding-0", label: "安全帽", checked: false },
      { id: "riding-1", label: "手套", checked: false },
      { id: "riding-2", label: "雨衣雨褲", checked: false },
      { id: "riding-3", label: "防風鏡片 / 口罩", checked: false }
    ]},
    { id: "clothes", name: "衣物", color: "#7a6a9a", items: [
      { id: "clothes-0", label: "排汗衣", checked: false },
      { id: "clothes-1", label: "保暖外套（早晚溫差大）", checked: false },
      { id: "clothes-2", label: "換洗衣物、襪子", checked: false }
    ]},
    { id: "care", name: "盥洗保養", color: "#3a7a5a", items: [
      { id: "care-0", label: "防曬乳", checked: false },
      { id: "care-1", label: "牙刷牙膏", checked: false },
      { id: "care-2", label: "毛巾（溫泉用）", checked: false },
      { id: "care-3", label: "個人藥品", checked: false }
    ]},
    { id: "electronics", name: "3C用品", color: "#b08a2e", items: [
      { id: "electronics-0", label: "手機充電線", checked: false },
      { id: "electronics-1", label: "行動電源", checked: false },
      { id: "electronics-2", label: "車充 / 車架", checked: false }
    ]},
    { id: "extras", name: "其他", color: "#5a6a7a", items: [
      { id: "extras-0", label: "伴手禮袋子（裝生乳捲）", checked: false },
      { id: "extras-1", label: "垃圾袋", checked: false }
    ]}
  ]
};
