(function(){
"use strict";

var POLL_MS = 25000;
var NOMINATIM_URL = "https://nominatim.openstreetmap.org/search?format=json&countrycodes=tw&addressdetails=0&limit=6&q=";

var DATA = null;          // 目前畫面上顯示的資料
var pendingData = null;   // 輪詢抓到但因為正在編輯而還沒套用的資料
var editingCount = 0;     // 目前有幾個編輯面板是開著的
var currentDayTab = "day1";

// ---------- 小工具 ----------
function escapeHtml(s){
  return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){
    return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c];
  });
}
function uid(){ return "s_" + Math.random().toString(36).slice(2, 9); }
function debounce(fn, ms){
  var t;
  return function(){
    var args = arguments, ctx = this;
    clearTimeout(t);
    t = setTimeout(function(){ fn.apply(ctx, args); }, ms);
  };
}
function byId(id){ return document.getElementById(id); }

// ---------- 讀寫後端 ----------
function loadData(isPoll){
  if(!API_URL){
    DATA = SEED_DATA;
    renderAll();
    byId("syncBanner").hidden = true;
    return Promise.resolve();
  }
  return fetch(API_URL)
    .then(function(r){ return r.json(); })
    .then(function(json){
      if(!json || !json.days){
        // Google Sheet 是空的，第一次用 seed 資料種進去
        return saveData(SEED_DATA, true);
      }
      if(editingCount > 0 && isPoll){
        pendingData = json;
        byId("syncBanner").hidden = false;
      } else {
        DATA = json;
        pendingData = null;
        byId("syncBanner").hidden = true;
        renderAll();
      }
    })
    .catch(function(err){
      console.error("載入失敗", err);
      if(!DATA){ DATA = SEED_DATA; renderAll(); }
    });
}

function saveData(newData, skipReload){
  DATA = newData;
  if(!API_URL){
    renderAll();
    return Promise.resolve();
  }
  return fetch(API_URL, { method: "POST", body: JSON.stringify(newData) })
    .then(function(r){ return r.json(); })
    .then(function(res){
      if(!res || !res.ok){ console.error("儲存失敗", res); alert("儲存失敗，請稍後再試一次"); }
      if(!skipReload){ renderAll(); }
    })
    .catch(function(err){
      console.error("儲存失敗", err);
      alert("儲存失敗，請確認網路連線");
    });
}

// ---------- render：整體 ----------
function renderAll(){
  renderInfo();
  renderWeather();
  renderOverview();
  renderMapSection();
  renderDay("day1");
  renderDay("day2");
  showDayTab(currentDayTab);
}

// ---------- 住宿／交通卡 ----------
function renderInfo(){
  renderInfoCard("lodging", byId("lodgingCard"), "📍 開地圖");
  renderInfoCard("transport", byId("transportCard"), null);
}
function renderInfoCard(key, container, linkLabel){
  var d = DATA.info[key];
  var rowsHtml = d.rows.map(function(r, i){
    return '<div class="row" data-row="' + i + '"><span>' + escapeHtml(r[0]) + '</span><span>' + escapeHtml(r[1]) + '</span></div>';
  }).join("");
  var linkHtml = "";
  if(linkLabel && d.mapQuery){
    linkHtml = '<a class="pill-link" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(d.mapQuery) + '">' + linkLabel + "</a>";
  }
  container.innerHTML =
    '<div class="view">' +
      '<div class="cardhead"><div class="label">' + container.dataset.label + '</div><button class="icon-btn" data-act="edit">✏️</button></div>' +
      '<div class="title">' + escapeHtml(d.title) + "</div>" +
      '<div class="sub">' + escapeHtml(d.sub) + "</div>" +
      rowsHtml + linkHtml +
    "</div>" +
    '<div class="edit" hidden>' +
      '<div class="cardhead"><div class="label">' + container.dataset.label + '</div><button class="icon-btn" data-act="save">💾 儲存</button></div>' +
      '<input class="f-title" value="' + escapeHtml(d.title) + '" placeholder="標題">' +
      '<textarea class="f-sub" rows="2" placeholder="說明">' + escapeHtml(d.sub) + "</textarea>" +
      '<div class="f-rows">' +
        d.rows.map(function(r, i){
          return '<div class="f-row"><input class="f-row-k" value="' + escapeHtml(r[0]) + '" placeholder="欄位"><input class="f-row-v" value="' + escapeHtml(r[1]) + '" placeholder="值"></div>';
        }).join("") +
      "</div>" +
      (key === "lodging" ? '<input class="f-mapq" value="' + escapeHtml(d.mapQuery || "") + '" placeholder="地圖搜尋關鍵字">' : "") +
    "</div>";

  var editEl = container.querySelector(".edit");
  var viewEl = container.querySelector(".view");
  container.querySelector('[data-act="edit"]').addEventListener("click", function(){
    editingCount++;
    viewEl.hidden = true;
    editEl.hidden = false;
  });
  container.querySelector('[data-act="save"]').addEventListener("click", function(){
    var next = JSON.parse(JSON.stringify(DATA));
    var rows = Array.prototype.map.call(editEl.querySelectorAll(".f-row"), function(row){
      return [row.querySelector(".f-row-k").value, row.querySelector(".f-row-v").value];
    });
    next.info[key] = {
      title: editEl.querySelector(".f-title").value,
      sub: editEl.querySelector(".f-sub").value,
      rows: rows
    };
    if(key === "lodging"){ next.info[key].mapQuery = editEl.querySelector(".f-mapq").value; }
    editingCount = Math.max(0, editingCount - 1);
    saveData(next);
  });
}

// ---------- 天氣卡 ----------
function renderWeather(){
  var wrap = byId("weatherRow");
  wrap.innerHTML = DATA.weather.map(function(w, i){
    return '<div class="card wcard" data-i="' + i + '">' +
      '<div class="view">' +
        '<button class="icon-btn edit-corner" data-act="edit">✏️</button>' +
        '<div class="wday">' + escapeHtml(w.day) + "</div>" +
        '<div class="wicon">' + escapeHtml(w.icon) + "</div>" +
        '<div class="wtemp">' + escapeHtml(w.temp) + "</div>" +
        '<div class="wrain">' + escapeHtml(w.note) + "</div>" +
      "</div>" +
      '<div class="edit" hidden>' +
        '<input class="f-day" value="' + escapeHtml(w.day) + '" placeholder="日期">' +
        '<input class="f-icon" value="' + escapeHtml(w.icon) + '" placeholder="emoji">' +
        '<input class="f-temp" value="' + escapeHtml(w.temp) + '" placeholder="溫度">' +
        '<input class="f-note" value="' + escapeHtml(w.note) + '" placeholder="說明">' +
        '<button class="icon-btn" data-act="save">💾 儲存</button>' +
      "</div>" +
    "</div>";
  }).join("");

  wrap.querySelectorAll(".wcard").forEach(function(card){
    var i = Number(card.dataset.i);
    var viewEl = card.querySelector(".view"), editEl = card.querySelector(".edit");
    card.querySelector('[data-act="edit"]').addEventListener("click", function(){
      editingCount++; viewEl.hidden = true; editEl.hidden = false;
    });
    card.querySelector('[data-act="save"]').addEventListener("click", function(){
      var next = JSON.parse(JSON.stringify(DATA));
      next.weather[i] = {
        day: editEl.querySelector(".f-day").value,
        icon: editEl.querySelector(".f-icon").value,
        temp: editEl.querySelector(".f-temp").value,
        note: editEl.querySelector(".f-note").value
      };
      editingCount = Math.max(0, editingCount - 1);
      saveData(next);
    });
  });
}

// ---------- 兩天總覽卡 ----------
function renderOverview(){
  ["day1", "day2"].forEach(function(key, idx){
    var day = DATA.days[key];
    var el = byId("overview-" + key);
    var items = day.stops.slice(0, 5).map(function(s){
      return "<li>" + escapeHtml(s.name) + (s.badge ? "・" + escapeHtml(s.badge) : "") + "</li>";
    }).join("");
    el.querySelector(".dtag").textContent = day.tag;
    el.querySelector(".dtitle").textContent = day.label.replace(/^Day \d\s*[—-]\s*/, (idx === 0 ? "Day 1 " : "Day 2 "));
    el.querySelector("ul").innerHTML = items;
  });
}

// ---------- 地圖區（整天路線 + 單點） ----------
function buildRouteUrl(stops){
  var withAddr = stops.filter(function(s){ return s.address; });
  if(withAddr.length < 2) return null;
  var encoded = withAddr.map(function(s){ return encodeURIComponent(s.name + "、" + s.address); });
  return "https://maps.google.com/maps?saddr=" + encoded[0] + "&daddr=" + encoded.slice(1).join("+to:") + "&output=embed";
}
function singleMapUrl(stop){
  return "https://maps.google.com/maps?q=" + encodeURIComponent(stop.name + " " + stop.address) + "&output=embed";
}

function renderMapSection(){
  ["day1", "day2"].forEach(function(key){
    var day = DATA.days[key];
    var routeUrl = buildRouteUrl(day.stops);
    var card = byId("routecard-" + key);
    if(routeUrl){
      card.innerHTML = '<iframe src="' + routeUrl + '" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>' +
        '<div class="routemeta"><b>' + (key === "day1" ? "Day 1" : "Day 2") + ' 順路：</b>' +
        day.stops.filter(function(s){ return s.address; }).map(function(s){ return escapeHtml(s.name); }).join(" → ") + "</div>";
    } else {
      card.innerHTML = '<div class="routemeta">這天還沒有兩個以上有地址的地點，先新增地點就會自動出現路線圖。</div>';
    }

    var withAddr = day.stops.filter(function(s){ return s.address; });
    var chipsWrap = byId("stoplist-" + key);
    chipsWrap.innerHTML = withAddr.map(function(s, i){
      return '<span class="stopchip' + (i === 0 ? " active" : "") + '" data-addr="' + escapeHtml(s.name + " " + s.address) + '"><span class="n">' + (i + 1) + "</span>" + escapeHtml(s.name) + "</span>";
    }).join("");
    chipsWrap.querySelectorAll(".stopchip").forEach(function(chip){
      chip.addEventListener("click", function(){
        chipsWrap.querySelectorAll(".stopchip").forEach(function(c){ c.classList.remove("active"); });
        chip.classList.add("active");
        byId("singleMap").src = "https://maps.google.com/maps?q=" + encodeURIComponent(chip.dataset.addr) + "&output=embed";
      });
    });
    if(key === currentDayTab && withAddr.length){
      byId("singleMap").src = singleMapUrl(withAddr[0]);
    }
  });
}

function showDayTab(key){
  currentDayTab = key;
  ["day1", "day2"].forEach(function(k){
    byId("tabbtn-" + k).classList.toggle("active", k === key);
    byId("routecard-" + k).style.display = k === key ? "" : "none";
    byId("stoplist-" + k).style.display = k === key ? "flex" : "none";
  });
  var withAddr = DATA.days[key].stops.filter(function(s){ return s.address; });
  if(withAddr.length){ byId("singleMap").src = singleMapUrl(withAddr[0]); }
}

// ---------- 每日時間軸（含編輯／拖拉／新增／刪除） ----------
var BADGE_LABEL = { normal: "一般", alt: "重點", plan: "彈性／未定" };

function stopCardHtml(stop){
  var cls = "stopcard" + (stop.badgeType === "alt" ? " alt" : "") + (stop.badgeType === "plan" ? " plan" : "");
  var badgeHtml = stop.badge ? '<span class="badge' + (stop.badgeType === "alt" ? " alt" : "") + '">' + escapeHtml(stop.badge) + "</span>" : "";
  var extraHtml = stop.extra && stop.extra.length ? '<div class="meta-line">' + stop.extra.map(function(x){ return "<span>" + escapeHtml(x) + "</span>"; }).join("") + "</div>" : "";
  var durHtml = stop.durationMin ? '<div class="meta-line"><span>⏳ 停留約 ' + stop.durationMin + " 分鐘</span></div>" : "";
  var mapHtml = stop.address ? '<a class="maplink" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(stop.name + " " + stop.address) + '">在 Google 地圖開啟 →</a>' : "";
  return (
    '<div class="' + cls + '">' +
      '<div class="view">' +
        '<div class="stopbar"><span class="drag-handle" title="拖曳排序">⠿</span>' +
          '<h4>' + escapeHtml(stop.name) + badgeHtml + "</h4>" +
          '<span class="spacer"></span>' +
          '<button class="icon-btn" data-act="edit">✏️</button>' +
          '<button class="icon-btn danger" data-act="del">🗑️</button>' +
        "</div>" +
        (stop.note ? "<p>" + stop.note + "</p>" : "") +
        extraHtml + durHtml + mapHtml +
      "</div>" +
      '<div class="edit" hidden>' +
        '<div class="f-grid">' +
          '<input class="f-time" value="' + escapeHtml(stop.time) + '" placeholder="時間，如 12:30">' +
          '<select class="f-badgeType">' +
            Object.keys(BADGE_LABEL).map(function(k){ return '<option value="' + k + '"' + (k === stop.badgeType ? " selected" : "") + ">" + BADGE_LABEL[k] + "</option>"; }).join("") +
          "</select>" +
        "</div>" +
        '<input class="f-name" value="' + escapeHtml(stop.name) + '" placeholder="地點名稱">' +
        '<input class="f-badge" value="' + escapeHtml(stop.badge || "") + '" placeholder="標籤文字（可留空）">' +
        '<div class="f-search">' +
          '<input class="f-searchbox" placeholder="🔍 搜尋地點自動帶入地址…">' +
          '<button type="button" class="icon-btn mappick-btn" data-act="mappick">🗺️ 地圖找</button>' +
          '<div class="f-searchresults"></div>' +
        "</div>" +
        '<input class="f-address" value="' + escapeHtml(stop.address || "") + '" placeholder="地址（也可以手動輸入/修改）">' +
        '<textarea class="f-note" rows="3" placeholder="說明">' + (stop.note || "") + "</textarea>" +
        '<input class="f-extra" value="' + escapeHtml((stop.extra || []).join(" ｜ ")) + '" placeholder="附加資訊，用「｜」分隔，例如 🕒 10:00–18:00 ｜ 📞 03-1234567">' +
        '<input class="f-duration" type="number" min="0" step="5" value="' + (stop.durationMin || "") + '" placeholder="停留分鐘數">' +
        '<button class="icon-btn" data-act="save">💾 儲存</button>' +
      "</div>" +
    "</div>"
  );
}

function wireSearchBox(root, onPick){
  var box = root.querySelector(".f-searchbox");
  var results = root.querySelector(".f-searchresults");
  if(!box) return;
  var doSearch = debounce(function(){
    var q = box.value.trim();
    if(q.length < 2){ results.innerHTML = ""; return; }
    fetch(NOMINATIM_URL + encodeURIComponent(q))
      .then(function(r){ return r.json(); })
      .then(function(list){
        if(!list || !list.length){ results.innerHTML = '<div class="f-searchempty">查無結果，試試更完整的地名</div>'; return; }
        results.innerHTML = list.map(function(item, i){
          return '<div class="f-searchitem" data-i="' + i + '">' + escapeHtml(item.display_name) + "</div>";
        }).join("");
        results.querySelectorAll(".f-searchitem").forEach(function(itemEl, i){
          itemEl.addEventListener("click", function(){
            onPick(list[i], box.value.trim());
            results.innerHTML = "";
          });
        });
      })
      .catch(function(){ results.innerHTML = '<div class="f-searchempty">搜尋失敗，請稍後再試</div>'; });
  }, 600);
  box.addEventListener("input", doSearch);
}

function renderDay(key){
  var day = DATA.days[key];
  var meta = byId(key + "-meta");
  var metaView = meta.querySelector(".view");
  var metaEdit = meta.querySelector(".edit");
  metaView.querySelector("h3").textContent = day.label;
  metaView.querySelector(".tag").textContent = day.tag;
  if(!meta.dataset.wired){
    meta.dataset.wired = "1";
    metaView.querySelector('[data-act="edit"]').addEventListener("click", function(){
      metaEdit.querySelector(".f-label").value = DATA.days[key].label;
      metaEdit.querySelector(".f-tag").value = DATA.days[key].tag;
      editingCount++; metaView.hidden = true; metaEdit.hidden = false;
    });
    metaEdit.querySelector('[data-act="save"]').addEventListener("click", function(){
      var next = JSON.parse(JSON.stringify(DATA));
      next.days[key].label = metaEdit.querySelector(".f-label").value;
      next.days[key].tag = metaEdit.querySelector(".f-tag").value;
      editingCount = Math.max(0, editingCount - 1);
      saveData(next);
    });
  }

  var timeline = byId(key + "-timeline");
  timeline.innerHTML = day.stops.map(function(stop){
    return '<div class="stop' + (stop.badgeType === "alt" ? " alt" : "") + '" data-id="' + stop.id + '">' +
      '<div class="time">' + escapeHtml(stop.time) + "</div>" +
      stopCardHtml(stop) +
    "</div>";
  }).join("");

  timeline.querySelectorAll(".stop").forEach(function(stopEl){
    var id = stopEl.dataset.id;
    var stop = day.stops.filter(function(s){ return s.id === id; })[0];
    var viewEl = stopEl.querySelector(".view");
    var editEl = stopEl.querySelector(".edit");

    stopEl.querySelector('[data-act="edit"]').addEventListener("click", function(){
      editingCount++; viewEl.hidden = true; editEl.hidden = false;
    });
    stopEl.querySelector('[data-act="del"]').addEventListener("click", function(){
      if(!confirm('確定要刪除「' + stop.name + '」嗎？')) return;
      var next = JSON.parse(JSON.stringify(DATA));
      next.days[key].stops = next.days[key].stops.filter(function(s){ return s.id !== id; });
      saveData(next);
    });
    wireSearchBox(editEl, function(picked, typedQuery){
      editEl.querySelector(".f-address").value = picked.display_name;
      var nameField = editEl.querySelector(".f-name");
      if(!nameField.value.trim()) nameField.value = typedQuery;
    });
    var mapBtn = editEl.querySelector('[data-act="mappick"]');
    if(mapBtn){ mapBtn.addEventListener("click", function(){ openMapModal(editEl); }); }
    stopEl.querySelector('[data-act="save"]').addEventListener("click", function(){
      var next = JSON.parse(JSON.stringify(DATA));
      var list = next.days[key].stops;
      var idx = list.findIndex(function(s){ return s.id === id; });
      var extraText = editEl.querySelector(".f-extra").value.trim();
      list[idx] = {
        id: id,
        time: editEl.querySelector(".f-time").value,
        name: editEl.querySelector(".f-name").value,
        badge: editEl.querySelector(".f-badge").value,
        badgeType: editEl.querySelector(".f-badgeType").value,
        note: editEl.querySelector(".f-note").value,
        address: editEl.querySelector(".f-address").value,
        durationMin: Number(editEl.querySelector(".f-duration").value) || null,
        extra: extraText ? extraText.split("｜").map(function(s){ return s.trim(); }).filter(Boolean) : []
      };
      editingCount = Math.max(0, editingCount - 1);
      saveData(next);
    });
  });

  if(window.Sortable && !timeline.dataset.sortableInit){
    timeline.dataset.sortableInit = "1";
    new Sortable(timeline, {
      handle: ".drag-handle",
      animation: 150,
      onEnd: function(){
        var ids = Array.prototype.map.call(timeline.querySelectorAll(".stop"), function(el){ return el.dataset.id; });
        var next = JSON.parse(JSON.stringify(DATA));
        var byIdMap = {};
        next.days[key].stops.forEach(function(s){ byIdMap[s.id] = s; });
        next.days[key].stops = ids.map(function(id){ return byIdMap[id]; });
        saveData(next);
      }
    });
  }

  wireAddStopForm(key);
}

function wireAddStopForm(key){
  var form = byId(key + "-addform");
  if(form.dataset.wired) return;
  form.dataset.wired = "1";
  wireSearchBox(form, function(picked, typedQuery){
    form.querySelector(".f-address").value = picked.display_name;
    var nameField = form.querySelector(".f-name");
    if(!nameField.value.trim()) nameField.value = typedQuery;
  });
  var mapBtn = form.querySelector('[data-act="mappick"]');
  if(mapBtn){ mapBtn.addEventListener("click", function(){ openMapModal(form); }); }
  form.querySelector('[data-act="add"]').addEventListener("click", function(){
    var name = form.querySelector(".f-name").value.trim();
    if(!name){ alert("請至少輸入地點名稱"); return; }
    var extraText = form.querySelector(".f-extra").value.trim();
    var stop = {
      id: uid(),
      time: form.querySelector(".f-time").value || "--:--",
      name: name,
      badge: form.querySelector(".f-badge").value,
      badgeType: form.querySelector(".f-badgeType").value,
      note: form.querySelector(".f-note").value,
      address: form.querySelector(".f-address").value,
      durationMin: Number(form.querySelector(".f-duration").value) || null,
      extra: extraText ? extraText.split("｜").map(function(s){ return s.trim(); }).filter(Boolean) : []
    };
    var next = JSON.parse(JSON.stringify(DATA));
    next.days[key].stops.push(stop);
    form.querySelectorAll("input, textarea").forEach(function(i){ i.value = ""; });
    form.querySelector(".f-badgeType").value = "normal";
    saveData(next);
  });
}

// ---------- note（給重機/開車的小提醒，含 AI 建議） ----------
function renderNote(){
  var section = byId("noteSection");
  var viewEl = section.querySelector(".view");
  var editEl = section.querySelector(".edit");
  byId("noteTitle").textContent = DATA.note.title;
  byId("noteList").innerHTML = DATA.note.items.map(function(t){ return "<li>" + escapeHtml(t) + "</li>"; }).join("");

  if(section.dataset.wired) return;
  section.dataset.wired = "1";
  var statusEl = editEl.querySelector(".ai-status");

  viewEl.querySelector('[data-act="edit"]').addEventListener("click", function(){
    editEl.querySelector(".f-title").value = DATA.note.title;
    editEl.querySelector(".f-items").value = DATA.note.items.join("\n");
    statusEl.textContent = "";
    editingCount++; viewEl.hidden = true; editEl.hidden = false;
  });
  editEl.querySelector('[data-act="save"]').addEventListener("click", function(){
    var next = JSON.parse(JSON.stringify(DATA));
    var items = editEl.querySelector(".f-items").value.split("\n").map(function(s){ return s.trim(); }).filter(Boolean);
    next.note = { title: editEl.querySelector(".f-title").value, items: items };
    editingCount = Math.max(0, editingCount - 1);
    saveData(next);
  });
  editEl.querySelector('[data-act="suggest"]').addEventListener("click", function(){
    if(!API_URL){
      statusEl.textContent = "⚠️ 還沒接 Google Sheet 後端，AI 建議需要後端幫忙打 API，本機模式無法使用。";
      return;
    }
    statusEl.textContent = "🤖 正在依目前行程內容請 AI 給建議…";
    fetch(API_URL, { method: "POST", body: JSON.stringify({ __action: "suggest_note", trip: DATA }) })
      .then(function(r){ return r.json(); })
      .then(function(res){
        if(res && res.ok && res.items && res.items.length){
          editEl.querySelector(".f-items").value = res.items.join("\n");
          statusEl.textContent = "✅ 已帶入 AI 建議，確認內容沒問題後記得按「💾 儲存」。";
        } else {
          statusEl.textContent = "⚠️ 取得建議失敗：" + (res && res.error ? res.error : "未知錯誤") + "（Apps Script 是否已設定 GEMINI_API_KEY？）";
        }
      })
      .catch(function(){
        statusEl.textContent = "⚠️ 連線失敗，請稍後再試。";
      });
  });
}

// ---------- 地圖彈窗（搜尋 + 點地圖挑地點，Leaflet + OSM，免金鑰） ----------
var leafletMap = null;
var leafletMarker = null;
var mapModalTarget = null;
var mapPicked = null;

function ensureLeafletMap(){
  if(leafletMap) return;
  leafletMap = L.map("leafletMap").setView([24.75, 121.75], 11);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(leafletMap);
  leafletMap.on("click", function(e){
    reverseGeocode(e.latlng.lat, e.latlng.lng);
  });
}

function setMapPicked(name, address, lat, lng){
  mapPicked = { name: name, address: address };
  if(leafletMarker){ leafletMap.removeLayer(leafletMarker); }
  leafletMarker = L.marker([lat, lng]).addTo(leafletMap);
  leafletMap.setView([lat, lng], 16);
  byId("mapModalPicked").textContent = "📍 " + address;
  byId("mapModalUse").disabled = false;
}

function reverseGeocode(lat, lng){
  byId("mapModalPicked").textContent = "查詢中…";
  fetch("https://nominatim.openstreetmap.org/reverse?format=json&lat=" + lat + "&lon=" + lng)
    .then(function(r){ return r.json(); })
    .then(function(res){
      var addr = res && res.display_name ? res.display_name : (lat.toFixed(5) + ", " + lng.toFixed(5));
      var shortName = addr.split(",")[0].trim() || addr;
      setMapPicked(shortName, addr, lat, lng);
    })
    .catch(function(){
      byId("mapModalPicked").textContent = "查詢失敗，請再點一次或改用搜尋";
    });
}

function openMapModal(targetRoot){
  mapModalTarget = targetRoot;
  mapPicked = null;
  byId("mapModalSearch").value = "";
  byId("mapModalResults").innerHTML = "";
  byId("mapModalPicked").textContent = "搜尋地點，或直接點地圖上任一點";
  byId("mapModalUse").disabled = true;
  byId("mapModalBackdrop").hidden = false;
  ensureLeafletMap();
  setTimeout(function(){ leafletMap.invalidateSize(); }, 50);
  if(leafletMarker){ leafletMap.removeLayer(leafletMarker); leafletMarker = null; }
}
function closeMapModal(){
  byId("mapModalBackdrop").hidden = true;
  mapModalTarget = null;
}

var _origRenderAll = renderAll;
renderAll = function(){ _origRenderAll(); renderNote(); };

// ---------- 啟動 ----------
document.addEventListener("DOMContentLoaded", function(){
  byId("tabbtn-day1").addEventListener("click", function(){ showDayTab("day1"); });
  byId("tabbtn-day2").addEventListener("click", function(){ showDayTab("day2"); });
  byId("syncRefreshBtn").addEventListener("click", function(){
    if(pendingData){ DATA = pendingData; pendingData = null; }
    editingCount = 0;
    byId("syncBanner").hidden = true;
    renderAll();
  });

  byId("mapModalClose").addEventListener("click", closeMapModal);
  byId("mapModalBackdrop").addEventListener("click", function(e){
    if(e.target === byId("mapModalBackdrop")) closeMapModal();
  });
  byId("mapModalUse").addEventListener("click", function(){
    if(!mapModalTarget || !mapPicked) return;
    var addrField = mapModalTarget.querySelector(".f-address");
    var nameField = mapModalTarget.querySelector(".f-name");
    if(addrField) addrField.value = mapPicked.address;
    if(nameField && !nameField.value.trim()) nameField.value = mapPicked.name;
    closeMapModal();
  });
  var mapSearchResults = byId("mapModalResults");
  var mapSearchDebounced = debounce(function(){
    var q = byId("mapModalSearch").value.trim();
    if(q.length < 2){ mapSearchResults.innerHTML = ""; return; }
    fetch(NOMINATIM_URL + encodeURIComponent(q))
      .then(function(r){ return r.json(); })
      .then(function(list){
        if(!list || !list.length){ mapSearchResults.innerHTML = '<div class="f-searchempty">查無結果，試試更完整的地名</div>'; return; }
        mapSearchResults.innerHTML = list.map(function(item, i){
          return '<div class="f-searchitem" data-i="' + i + '">' + escapeHtml(item.display_name) + "</div>";
        }).join("");
        mapSearchResults.querySelectorAll(".f-searchitem").forEach(function(itemEl, i){
          itemEl.addEventListener("click", function(){
            var item = list[i];
            setMapPicked(byId("mapModalSearch").value.trim(), item.display_name, Number(item.lat), Number(item.lon));
            mapSearchResults.innerHTML = "";
          });
        });
      })
      .catch(function(){ mapSearchResults.innerHTML = '<div class="f-searchempty">搜尋失敗，請稍後再試</div>'; });
  }, 600);
  byId("mapModalSearch").addEventListener("input", mapSearchDebounced);

  loadData(false).then(function(){
    setInterval(function(){ loadData(true); }, POLL_MS);
  });
});

})();
