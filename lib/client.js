;(function () {
  'use strict'
  var loader = typeof window !== 'undefined' ? window.__ModuleLoader__ : undefined
  if (!loader || typeof loader.load !== 'function') return

  loader.load({
    id: 'dsh-jiahao-mode',
    factory: function () {
      var module = { exports: {} }
      var exports = module.exports

      /* 宠物帧：仓库版为 null（无宠物），个人版由打包脚本注入 base64。 */
      var PET_FRAMES = null /* 打包脚本按本行替换为 base64 帧数组 */

      var API = '/jiahao/api'
      var POLL = 1500

      var CSS = [
        '.jh-panel{position:fixed;right:16px;top:76px;width:232px;z-index:2147482000;background:linear-gradient(180deg,rgba(18,20,26,.97),rgba(11,13,17,.97));border:1px solid rgba(240,180,0,.35);border-radius:12px;color:#e8eaf0;font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;box-shadow:0 12px 30px rgba(0,0,0,.38);overflow:hidden;user-select:none}',
        '.jh-head{display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:rgba(240,180,0,.08);border-bottom:1px solid rgba(255,255,255,.06);cursor:pointer}',
        '.jh-title{font-weight:700;letter-spacing:.08em;color:#f0b400}',
        '.jh-toggle{opacity:.55}',
        '.jh-panel[data-collapsed="1"] .jh-body{display:none}',
        '.jh-body{padding:10px}',
        '.jh-hao{display:flex;align-items:baseline;gap:6px}',
        '.jh-hao b{font-size:26px;color:#fff;line-height:1}',
        '.jh-hao span{color:#8b93a3}',
        '.jh-bar{height:6px;background:#232833;border-radius:999px;margin:6px 0 10px;overflow:hidden}',
        '.jh-bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#f0b400,#ff5d3a);transition:width .35s}',
        '.jh-tone{display:flex;gap:4px;margin:0 0 10px}',
        '.jh-tone button{flex:1;background:#1b202b;color:#9aa4b8;border:1px solid #2a3140;border-radius:6px;padding:3px 0;font:inherit;font-size:11px;cursor:pointer;transition:all .15s}',
        '.jh-tone button:hover{border-color:#4a5468;color:#dfe4ee}',
        '.jh-tone button[data-active="1"]{background:rgba(240,180,0,.16);border-color:#f0b400;color:#f0b400}',
        '.jh-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 10px;margin-bottom:8px}',
        '.jh-grid b{display:block;font-size:15px;color:#fff}',
        '.jh-grid span{color:#8b93a3;font-size:10px;letter-spacing:.06em}',
        '.jh-feed{list-style:none;margin:0;padding:6px 0 0;border-top:1px dashed rgba(255,255,255,.08);max-height:150px;overflow:hidden}',
        '.jh-feed li{padding:2px 0;color:#c9cede;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;animation:jh-in .22s ease-out}',
        '.jh-feed li b{color:#f0b400;margin-right:4px}',
        '.jh-feed li[data-kind="fail"] b{color:#ff6b57}',
        '.jh-feed li[data-kind="settle"] b{color:#73e08a}',
        '@keyframes jh-in{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:none}}',
        '.jh-settle{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:2147482500;background:rgba(6,8,12,.55)}',
        '.jh-settle[hidden]{display:none}',
        '.jh-card{width:320px;padding:22px;background:#101319;border:1px solid rgba(240,180,0,.5);border-radius:16px;text-align:center;color:#e8eaf0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;box-shadow:0 20px 60px rgba(0,0,0,.5);animation:jh-pop .25s ease-out}',
        '@keyframes jh-pop{from{transform:scale(.92);opacity:0}to{transform:none;opacity:1}}',
        '.jh-grade{font-size:64px;font-weight:800;line-height:1;color:#f0b400;text-shadow:0 0 24px rgba(240,180,0,.35)}',
        '.jh-grade[data-g="A"]{color:#73e08a}',
        '.jh-grade[data-g="B"]{color:#9aa4b8}',
        '.jh-grade[data-g="C"]{color:#ff6b57}',
        '.jh-stamp{margin-top:10px;font-size:19px;font-weight:700;letter-spacing:.18em;color:#ff5d3a;border:2px solid #ff5d3a;border-radius:6px;display:inline-block;padding:2px 10px;transform:rotate(-6deg)}',
        '.jh-stats{margin-top:12px;color:#9aa4b8}',
        '.jh-note{margin-top:8px;color:#6f7788;font-size:11px}'
      ].join('\n')

      var PET_CSS = [
        '.jh-pet{position:fixed;right:24px;bottom:24px;width:168px;height:202px;z-index:2147483000;user-select:none;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}',
        '.jh-pet__rig{position:relative;width:168px;height:168px;transform-origin:50% 85%;filter:drop-shadow(0 8px 10px rgba(0,0,0,.32));animation:jh-breathe 2.4s ease-in-out infinite}',
        '.jh-pet__frame{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;opacity:0;transition:opacity 90ms linear}',
        '.jh-pet__frame.is-active{opacity:1}',
        '.jh-pet__badge{position:absolute;left:50%;bottom:-26px;transform:translateX(-50%);padding:3px 8px;border:1px solid rgba(240,180,0,.65);border-radius:999px;background:rgba(20,20,20,.88);color:#f4cc55;font-size:10px;white-space:nowrap;letter-spacing:.04em}',
        '.jh-pet.is-shaking .jh-pet__rig{animation:jh-shake 560ms steps(1,end) both}',
        '.jh-pet.is-muted{opacity:.42;filter:grayscale(.7)}',
        '@keyframes jh-shake{0%{transform:translateX(0) rotate(0)}20%{transform:translateX(-3px) rotate(-2deg)}40%{transform:translateX(4px) rotate(2.4deg)}60%{transform:translateX(-4px) rotate(-2.2deg)}80%{transform:translateX(2px) rotate(1.2deg)}100%{transform:translateX(0) rotate(0)}}',
        '@keyframes jh-breathe{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-2px) rotate(-.7deg)}}',
        '@media (prefers-reduced-motion: reduce){.jh-pet__rig{animation:none}.jh-pet.is-shaking .jh-pet__rig{animation:none}}'
      ].join('\n')

      function mountPet() {
        if (!PET_FRAMES || !PET_FRAMES.length) return null
        var root = document.createElement('div')
        root.className = 'jh-pet'
        root.setAttribute('role', 'img')
        root.setAttribute('aria-label', '嘉豪 · 威龙抖枪宠物')
        root.innerHTML = '<div class="jh-pet__rig"></div><div class="jh-pet__badge">嘉豪 · 威龙</div>'
        document.body.appendChild(root)

        var rig = root.querySelector('.jh-pet__rig')
        var imgs = PET_FRAMES.map(function (src, i) {
          var img = document.createElement('img')
          img.className = 'jh-pet__frame' + (i === 0 ? ' is-active' : '')
          img.src = src
          img.alt = ''
          img.draggable = false
          rig.appendChild(img)
          return img
        })

        var timer = null
        var muted = false
        var timing = [220, 180, 160, 120, 120, 220]

        function show(i) {
          imgs.forEach(function (el, n) { el.classList.toggle('is-active', n === i) })
        }
        function stop() { if (timer) { clearTimeout(timer); timer = null } }
        function play(seq, done) {
          stop()
          if (muted) return
          var pos = 0
          function tick() {
            show(seq[pos])
            if (++pos >= seq.length) { timer = null; if (done) done(); return }
            timer = setTimeout(tick, timing[seq[pos - 1]] || 160)
          }
          tick()
        }
        function shake() {
          if (muted) return
          root.classList.remove('is-shaking')
          void root.offsetWidth
          root.classList.add('is-shaking')
          play([1, 2, 3, 4, 5, 3, 2, 1, 0], function () { root.classList.remove('is-shaking') })
        }
        function setMuted(v) {
          muted = v === undefined ? !muted : !!v
          root.classList.toggle('is-muted', muted)
          stop()
          if (muted) show(0)
        }
        function onContext(e) { e.preventDefault(); setMuted() }
        root.addEventListener('click', shake)
        root.addEventListener('contextmenu', onContext)
        window.addEventListener('dsh:pet-shake', shake)
        window.addEventListener('dsh:task-success', shake)

        return function () {
          stop()
          root.removeEventListener('click', shake)
          root.removeEventListener('contextmenu', onContext)
          window.removeEventListener('dsh:pet-shake', shake)
          window.removeEventListener('dsh:task-success', shake)
          if (root.parentNode) root.parentNode.removeChild(root)
        }
      }

      function apply(ctx) {
        ctx.effect(function () {
          var style = document.createElement('style')
          style.setAttribute('data-dsh-plugin', 'dsh-jiahao-mode')
          style.textContent = CSS + '\n' + PET_CSS
          document.head.appendChild(style)

          var panel = document.createElement('div')
          panel.className = 'jh-panel'
          panel.innerHTML = [
            '<div class="jh-head"><span class="jh-title">嘉豪 · 突击</span><span class="jh-toggle">−</span></div>',
            '<div class="jh-body">',
            '  <div class="jh-hao"><b data-k="hao">50</b><span>豪气值</span></div>',
            '  <div class="jh-bar"><i data-k="bar"></i></div>',
            '  <div class="jh-tone">',
            '    <button data-tone="quiet">屏息</button>',
            '    <button data-tone="normal">小声豪</button>',
            '    <button data-tone="loud">放开豪</button>',
            '  </div>',
            '  <div class="jh-grid">',
            '    <div><b data-k="kills">0</b><span>击杀</span></div>',
            '    <div><b data-k="fails">0</b><span>卡了</span></div>',
            '    <div><b data-k="streak">0</b><span>连杀</span></div>',
            '    <div><b data-k="best">0</b><span>最佳</span></div>',
            '  </div>',
            '  <ul class="jh-feed"></ul>',
            '</div>'
          ].join('')
          document.body.appendChild(panel)

          var q = function (k) { return panel.querySelector('[data-k="' + k + '"]') }
          var feedEl = panel.querySelector('.jh-feed')
          var head = panel.querySelector('.jh-head')
          head.addEventListener('click', function () {
            panel.dataset.collapsed = panel.dataset.collapsed === '1' ? '0' : '1'
          })

          var toneBtns = Array.prototype.slice.call(panel.querySelectorAll('[data-tone]'))
          function paintTone(tone) {
            toneBtns.forEach(function (b) { b.dataset.active = b.dataset.tone === tone ? '1' : '0' })
          }
          function pickTone(tone) {
            fetch(API + '/tone', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ tone: tone }),
            })
              .then(function (r) { return r.ok ? r.json() : null })
              .then(function (d) { if (d && d.ok) { paintTone(d.tone); poll() } })
              .catch(function () {})
          }
          toneBtns.forEach(function (b) {
            b.addEventListener('click', function (e) { e.stopPropagation(); pickTone(b.dataset.tone) })
          })

          var settle = document.createElement('div')
          settle.className = 'jh-settle'
          settle.hidden = true
          settle.innerHTML = [
            '<div class="jh-card">',
            '  <div class="jh-grade" data-g="A">A</div>',
            '  <div class="jh-stamp">豪到你了</div>',
            '  <div class="jh-stats"></div>',
            '  <div class="jh-note">点击任意处继续</div>',
            '</div>'
          ].join('')
          document.body.appendChild(settle)
          var gradeEl = settle.querySelector('.jh-grade')
          var statsEl = settle.querySelector('.jh-stats')
          var settleTimer = null
          function hideSettle() { settle.hidden = true }
          settle.addEventListener('click', hideSettle)

          var first = true
          var lastFeedId = 0
          var shownSettle = 0
          var timer = null

          function addFeed(item) {
            var li = document.createElement('li')
            li.dataset.kind = item.kind || 'kill'
            li.innerHTML = '<b>' + (item.kind === 'fail' ? '✕' : item.kind === 'settle' ? '★' : '▸') + '</b>'
            li.appendChild(document.createTextNode(item.text || ''))
            feedEl.insertBefore(li, feedEl.firstChild)
            while (feedEl.children.length > 6) feedEl.removeChild(feedEl.lastChild)
          }

          function renderFeed(items) {
            items.forEach(function (item) {
              if (item.id <= lastFeedId) return
              lastFeedId = item.id
              if (!first) addFeed(item)
            })
            if (first) {
              items.slice(-3).reverse().forEach(addFeed)
              first = false
            }
          }

          function showSettle(s) {
            if (!s || s.seq === shownSettle) return
            if (shownSettle === 0) { shownSettle = s.seq; return }
            shownSettle = s.seq
            gradeEl.textContent = s.grade
            gradeEl.dataset.g = s.grade
            statsEl.textContent = '击杀 ' + s.kills + ' · 卡了 ' + s.fails + ' · 豪气 ' + s.hao
            settle.hidden = false
            if (settleTimer) clearTimeout(settleTimer)
            settleTimer = setTimeout(hideSettle, 4500)
          }

          function render(state, tone) {
            if (tone) paintTone(tone)
            if (!state) return
            q('hao').textContent = state.hao
            q('bar').style.width = Math.max(0, Math.min(100, state.hao)) + '%'
            q('kills').textContent = state.kills
            q('fails').textContent = state.fails
            q('streak').textContent = state.streak
            q('best').textContent = state.bestStreak
            renderFeed(state.feed || [])
            showSettle(state.lastSettle)
          }

          function poll() {
            fetch(API + '/state', { cache: 'no-store' })
              .then(function (r) { return r.ok ? r.json() : null })
              .then(function (data) { if (data && data.ok) render(data.state, data.tone) })
              .catch(function () {})
          }

          poll()
          timer = setInterval(poll, POLL)
          var petDispose = mountPet()

          return function () {
            if (timer) clearInterval(timer)
            if (settleTimer) clearTimeout(settleTimer)
            if (petDispose) petDispose()
            if (panel.parentNode) panel.parentNode.removeChild(panel)
            if (settle.parentNode) settle.parentNode.removeChild(settle)
            if (style.parentNode) style.parentNode.removeChild(style)
          }
        }, 'dsh-jiahao-mode: hud')
      }

      exports.name = 'dsh-jiahao-mode-ui'
      exports.inject = []
      exports.apply = apply
      return module.exports
    }
  })
})()
