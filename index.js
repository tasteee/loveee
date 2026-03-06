;(function () {
	// ── Heart Emoji Occasional Flip ──────────────────────────────────────────────
	function initHeartFlip() {
		const heartElement = document.querySelector('.heart-emoji')
		if (!heartElement) return

		heartElement.style.display = 'inline-block'
		heartElement.style.transition = 'transform 0.25s ease-in-out'

		setInterval(() => {
			// Randomly decide whether to animate this cycle
			if (Math.random() > 0.3) return // 30% chance every 4 seconds

			// Step 1: Flip out
			heartElement.style.transform = 'rotateY(90deg)'

			setTimeout(() => {
				// Step 2: Change emoji and flip back in
				heartElement.style.transform = 'rotateY(0deg)'

				// Step 3: Hold for a bit, then flip out again
				setTimeout(() => {
					heartElement.style.transform = 'rotateY(90deg)'

					setTimeout(() => {
						// Step 4: Change back to heart and flip back in
						heartElement.textContent = '💖'
						heartElement.style.transform = 'rotateY(0deg)'
					}, 250)
				}, 2000)
			}, 250)
		}, 4000)
	}

	// Initialize it when DOM content is loaded
	document.addEventListener('DOMContentLoaded', initHeartFlip)

	// ── Constants ────────────────────────────────────────────────────────────
	var FULL_MONTHS = [
		'January',
		'February',
		'March',
		'April',
		'May',
		'June',
		'July',
		'August',
		'September',
		'October',
		'November',
		'December'
	]
	var SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
	var CHUNK_SIZE = 1000

	// ── Helpers ──────────────────────────────────────────────────────────────
	function escHtml(s) {
		return ('' + s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
	}

	function attachmentIcon(mimeType) {
		if (!mimeType) return '\uD83D\uDCCE' // 📎
		if (mimeType.startsWith('image/')) return '\uD83D\uDDBC\uFE0F' // 🖼️
		if (mimeType.startsWith('video/')) return '\uD83C\uDFAC' // 🎬
		if (mimeType.startsWith('audio/')) return '\uD83C\uDFB5' // 🎵
		return '\uD83D\uDCCE' // 📎
	}

	function formatTimestamp(ts) {
		var sp = ts.indexOf(' ')
		var dp = ts.slice(0, sp).split('-')
		var tp = ts.slice(sp + 1).split(':')
		var month = parseInt(dp[1], 10)
		var day = parseInt(dp[2], 10)
		var hours = parseInt(tp[0], 10)
		var mins = parseInt(tp[1], 10)
		var ampm = hours >= 12 ? 'pm' : 'am'
		var h = hours % 12 || 12
		var m = mins < 10 ? '0' + mins : '' + mins
		return SHORT_MONTHS[month - 1] + ' ' + day + ', ' + dp[0] + ' at ' + h + ':' + m + ampm
	}

	// ── HTML builders ─────────────────────────────────────────────────────────
	function buildDayRowHtml(dateStr) {
		var dp = dateStr.split('-')
		var label = FULL_MONTHS[parseInt(dp[1], 10) - 1] + ' ' + parseInt(dp[2], 10) + ', ' + dp[0]
		var le = escHtml(label)
		return (
			'<div id="day-' +
			dateStr +
			'" class="day-row" data-date="' +
			dateStr +
			'" data-label="' +
			le +
			'">' +
			'<div class="day-line"></div><div class="day-label">' +
			le +
			'</div><div class="day-line"></div></div>'
		)
	}

	function buildMessageRowHtml(msg, idx) {
		var sideClass = msg.isFromMe ? 'from-me' : 'from-them'
		var rawText = msg.text || ''
		var searchText = escHtml(rawText)
		var timeStr = escHtml(formatTimestamp(msg.timestamp))

		// Attachments
		var bubbleInner = ''
		if (msg.attachments && msg.attachments.length) {
			bubbleInner += '<div class="attachments-grid">'
			for (var a = 0; a < msg.attachments.length; a++) {
				var att = msg.attachments[a]
				if (att.filename === 'Audio Message.caf') {
					bubbleInner +=
						'<div class="voice-message-pill">' +
						'<span class="voice-icon">🎙️</span>' +
						'<span class="voice-label">Voice Message</span>' +
						'</div>'
				} else {
					var icon = attachmentIcon(att.mimeType)
					var name = escHtml(att.filename || '')
					var type = escHtml(att.mimeType || 'attachment')
					bubbleInner +=
						'<div class="attachment-card">' +
						'<span class="attachment-icon">' +
						icon +
						'</span>' +
						'<div class="attachment-info">' +
						'<span class="attachment-name">' +
						name +
						'</span>' +
						'<span class="attachment-type">' +
						type +
						'</span>' +
						'</div></div>'
				}
			}
			bubbleInner += '</div>'
		}

		// Text
		if (rawText) {
			bubbleInner += '<p class="bubble-text">' + escHtml(rawText).replace(/\n/g, '<br>') + '</p>'
		}

		// Reactions (rendered below the bubble)
		var reactionsHtml = ''
		if (msg.reactions && msg.reactions.length) {
			reactionsHtml = '<div class="reactions-row">'
			for (var r = 0; r < msg.reactions.length; r++) {
				var rx = msg.reactions[r]
				var emoji = typeof rx === 'string' ? rx : rx.emoji || rx.reaction || rx.type || ''
				if (emoji) {
					reactionsHtml += '<span class="reaction-pill">' + escHtml(emoji) + '</span>'
				}
			}
			reactionsHtml += '</div>'
		}

		return (
			'<div id="msg-' +
			idx +
			'" class="message-row ' +
			sideClass +
			'" data-search-text="' +
			searchText +
			'">' +
			'<div class="message-content">' +
			'<div class="bubble">' +
			bubbleInner +
			'</div>' +
			reactionsHtml +
			'<span class="bubble-time">' +
			timeStr +
			'</span>' +
			'</div></div>'
		)
	}

	// ── Chunked renderer ──────────────────────────────────────────────────────
	function renderChunked(messages, container) {
		var idx = 0
		var prevDate = null
		var total = messages.length

		function step() {
			var end = Math.min(idx + CHUNK_SIZE, total)
			var html = ''
			for (; idx < end; idx++) {
				try {
					var msg = messages[idx]
					var d = msg.timestamp.split(' ')[0]
					if (d !== prevDate) {
						html += buildDayRowHtml(d)
						prevDate = d
					}
					html += buildMessageRowHtml(msg, idx)
				} catch (e) {
					console.warn('[thread] skipped message at index', idx, e)
				}
			}
			container.insertAdjacentHTML('beforeend', html)
			if (idx < total) {
				requestAnimationFrame(step)
			}
		}

		step()
	}

	// ── UI (toolbar + search) — initialised immediately, queries DOM lazily ──
	function initUI() {
		var labelPrevDay = document.getElementById('label-prev-day')
		var labelNextDay = document.getElementById('label-next-day')
		var btnPrevDay = document.getElementById('btn-prev-day')
		var btnNextDay = document.getElementById('btn-next-day')
		var btnSearch = document.getElementById('btn-search')
		var searchPanel = document.getElementById('search-panel')
		var searchInput = document.getElementById('search-text-input')
		var searchResultsList = document.getElementById('search-results-list')
		var searchCountLabel = document.getElementById('search-count-label')
		var btnSearchSubmit = document.getElementById('btn-search-submit')
		var searchActive = false

		function getAbsoluteTop(el) {
			return el.getBoundingClientRect().top + window.scrollY
		}

		function updateDayLabels() {
			var dayRows = document.querySelectorAll('.day-row[data-date]')
			var scrollY = window.scrollY + 80
			var prevRow = null
			var nextRow = null
			for (var i = 0; i < dayRows.length; i++) {
				var top = getAbsoluteTop(dayRows[i])
				if (top < scrollY) {
					prevRow = dayRows[i]
				} else if (nextRow === null) {
					nextRow = dayRows[i]
				}
			}
			labelPrevDay.textContent = prevRow ? prevRow.dataset.label : 'Start'
			labelNextDay.textContent = nextRow ? nextRow.dataset.label : 'End'
		}

		btnPrevDay.addEventListener('click', function () {
			var dayRows = document.querySelectorAll('.day-row[data-date]')
			var scrollY = window.scrollY
			var target = null
			for (var i = dayRows.length - 1; i >= 0; i--) {
				if (getAbsoluteTop(dayRows[i]) < scrollY - 20) {
					target = dayRows[i]
					break
				}
			}
			if (target) {
				target.scrollIntoView({ behavior: 'smooth', block: 'start' })
			}
		})

		btnNextDay.addEventListener('click', function () {
			var dayRows = document.querySelectorAll('.day-row[data-date]')
			var scrollY = window.scrollY
			var target = null
			for (var i = 0; i < dayRows.length; i++) {
				if (getAbsoluteTop(dayRows[i]) > scrollY + 80) {
					target = dayRows[i]
					break
				}
			}
			if (target) {
				target.scrollIntoView({ behavior: 'smooth', block: 'start' })
			}
		})

		window.addEventListener('scroll', updateDayLabels, { passive: true })
		updateDayLabels()

		function openSearch() {
			searchActive = true
			searchPanel.classList.add('active')
			btnSearch.classList.add('search-active')
			searchInput.focus()
		}

		function closeSearch() {
			searchActive = false
			searchPanel.classList.remove('active')
			btnSearch.classList.remove('search-active')
			searchInput.value = ''
			searchResultsList.innerHTML = ''
			searchCountLabel.textContent = ''
		}

		btnSearch.addEventListener('click', function () {
			if (searchActive) {
				closeSearch()
			} else {
				openSearch()
			}
		})

		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape' && searchActive) {
				closeSearch()
			}
			if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
				e.preventDefault()
				if (!searchActive) {
					openSearch()
				}
			}
		})

		function buildSnippet(rawText, query) {
			var lowerText = rawText.toLowerCase()
			var lowerQuery = query.toLowerCase()
			var matchIdx = lowerText.indexOf(lowerQuery)
			if (matchIdx === -1) {
				return escHtml(rawText.substring(0, 90))
			}
			var start = Math.max(0, matchIdx - 30)
			var end = Math.min(rawText.length, start + 90)
			var slice = rawText.substring(start, end)
			var prefix = start > 0 ? '&hellip;' : ''
			var suffix = end < rawText.length ? '&hellip;' : ''
			var sliceLower = slice.toLowerCase()
			var idxInSlice = sliceLower.indexOf(lowerQuery)
			if (idxInSlice === -1) {
				return prefix + escHtml(slice) + suffix
			}
			var before = escHtml(slice.substring(0, idxInSlice))
			var match = escHtml(slice.substring(idxInSlice, idxInSlice + query.length))
			var after = escHtml(slice.substring(idxInSlice + query.length))
			return prefix + before + '<mark>' + match + '</mark>' + after + suffix
		}

		searchResultsList.addEventListener('click', function (e) {
			var item = e.target.closest('.search-result-item')
			if (!item) {
				return
			}
			var msgEl = document.getElementById(item.dataset.msgId)
			if (!msgEl) {
				return
			}
			msgEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
			msgEl.classList.add('jump-highlight')
			setTimeout(function () {
				msgEl.classList.remove('jump-highlight')
			}, 2500)
		})

		function performSearch() {
			var query = searchInput.value
			if (!query.trim()) {
				searchResultsList.innerHTML = ''
				searchCountLabel.textContent = ''
				return
			}
			var lowerQuery = query.toLowerCase()
			var allMessageRows = document.querySelectorAll('.message-row[data-search-text]')
			var matches = Array.from(allMessageRows).filter(function (el) {
				var text = (el.dataset.searchText || '').trim()
				return text !== '' && text.toLowerCase().indexOf(lowerQuery) !== -1
			})
			searchCountLabel.textContent = matches.length > 0 ? matches.length + ' result' + (matches.length !== 1 ? 's' : '') : ''
			if (matches.length === 0) {
				searchResultsList.innerHTML = '<div class="search-empty-state">No messages found</div>'
				return
			}
			var html = ''
			for (var i = 0; i < matches.length; i++) {
				var el = matches[i]
				var rawText = el.dataset.searchText || ''
				var timeEl = el.querySelector('.bubble-time')
				var timeLabel = timeEl ? escHtml(timeEl.textContent || '') : ''
				var sender = el.classList.contains('from-me') ? 'You' : 'Them'
				var snippet = buildSnippet(rawText, query)
				html += '<div class="search-result-item" data-msg-id="' + escHtml(el.id) + '">'
				html += '<div class="result-meta">' + sender + ' &middot; ' + timeLabel + '</div>'
				html += '<div class="result-text">' + snippet + '</div>'
				html += '</div>'
			}
			searchResultsList.innerHTML = html
		}

		btnSearchSubmit.addEventListener('click', performSearch)
		searchInput.addEventListener('keydown', function (e) {
			if (e.key === 'Enter') {
				performSearch()
			}
		})
	}

	// ── Boot: fetch → render; UI starts immediately ───────────────────────────
	var list = document.querySelector('.messages-list')
	list.innerHTML = '<div style="padding:32px 20px;opacity:0.45;font-size:14px">Loading messages\u2026</div>'

	initUI()

	fetch('thread.json')
		.then(function (res) {
			return res.json()
		})
		.then(function (data) {
			// Normalize: handle plain array or object wrapper
			var messages = Array.isArray(data) ? data : data.messages || data.data || data.items || data.thread || null

			console.log(
				'[thread] raw data type:',
				typeof data,
				Array.isArray(data) ? 'array len=' + data.length : 'object keys=' + Object.keys(data).join(',')
			)
			if (messages) {
				console.log('[thread] messages array length:', messages.length, 'first:', messages[0])
			}

			if (!messages || !messages.length) {
				list.innerHTML =
					'<div style="padding:32px 20px;color:#c0392b;font-size:14px">No messages found in thread.json. Check console for details.</div>'
				return
			}

			list.innerHTML = ''
			renderChunked(messages, list)
		})
		.catch(function (err) {
			console.error('[thread] fetch/parse error:', err)
			list.innerHTML =
				'<div style="padding:32px 20px;color:#c0392b;font-size:14px">Failed to load thread.json: ' +
				escHtml(String(err)) +
				'</div>'
		})
})()
