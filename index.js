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

	function formatDateLabel(dateStr) {
		var dp = dateStr.split('-')
		return SHORT_MONTHS[parseInt(dp[1], 10) - 1] + ' ' + parseInt(dp[2], 10) + ', ' + dp[0]
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

	// ── State ─────────────────────────────────────────────────────────────────
	var allMessages = []
	var messagesByDate = {}
	var sortedDates = []
	var currentDayIndex = 0

	// ── Grouping ──────────────────────────────────────────────────────────────
	function groupMessagesByDate(messages) {
		allMessages = messages
		messagesByDate = {}
		for (var i = 0; i < messages.length; i++) {
			var date = messages[i].timestamp.split(' ')[0]
			if (!messagesByDate[date]) messagesByDate[date] = []
			messagesByDate[date].push(i)
		}
		sortedDates = Object.keys(messagesByDate).sort()
	}

	// ── Day renderer ──────────────────────────────────────────────────────────
	function renderDay(dayIndex, container) {
		var dateStr = sortedDates[dayIndex]
		var indices = messagesByDate[dateStr]
		var html = buildDayRowHtml(dateStr)
		for (var i = 0; i < indices.length; i++) {
			var idx = indices[i]
			try {
				html += buildMessageRowHtml(allMessages[idx], idx)
			} catch (e) {
				console.warn('[thread] skipped message at index', idx, e)
			}
		}
		container.innerHTML = html
		window.scrollTo(0, 0)
		updateToolbarLabels(dayIndex)
	}

	function updateToolbarLabels(dayIndex) {
		var btnPrevDay = document.getElementById('btn-prev-day')
		var btnNextDay = document.getElementById('btn-next-day')
		var labelPrevDay = document.getElementById('label-prev-day')
		var labelNextDay = document.getElementById('label-next-day')

		if (dayIndex > 0) {
			labelPrevDay.textContent = formatDateLabel(sortedDates[dayIndex - 1])
			btnPrevDay.disabled = false
		} else {
			labelPrevDay.textContent = 'Start'
			btnPrevDay.disabled = true
		}

		if (dayIndex < sortedDates.length - 1) {
			labelNextDay.textContent = formatDateLabel(sortedDates[dayIndex + 1])
			btnNextDay.disabled = false
		} else {
			labelNextDay.textContent = 'End'
			btnNextDay.disabled = true
		}
	}

	// ── UI (toolbar + search) ─────────────────────────────────────────────────
	function initUI(list) {
		var btnPrevDay = document.getElementById('btn-prev-day')
		var btnNextDay = document.getElementById('btn-next-day')
		var toolbar = document.querySelector('.toolbar')
		var btnSearch = document.getElementById('btn-search')
		var searchPanel = document.getElementById('search-panel')
		var searchInput = document.getElementById('search-text-input')
		var searchResultsList = document.getElementById('search-results-list')
		var searchCountLabel = document.getElementById('search-count-label')
		var btnSearchSubmit = document.getElementById('btn-search-submit')
		var searchActive = false

		btnPrevDay.addEventListener('click', function () {
			if (currentDayIndex > 0) {
				currentDayIndex--
				renderDay(currentDayIndex, list)
			}
		})

		btnNextDay.addEventListener('click', function () {
			if (currentDayIndex < sortedDates.length - 1) {
				currentDayIndex++
				renderDay(currentDayIndex, list)
			}
		})

		function onViewportResize() {
			var vvp = window.visualViewport
			var keyboardHeight = Math.max(0, window.innerHeight - vvp.height - vvp.offsetTop)
			toolbar.style.bottom = (keyboardHeight + 28) + 'px'
			searchPanel.style.bottom = (keyboardHeight + 90) + 'px'
		}

		function openSearch() {
			searchActive = true
			searchPanel.classList.add('active')
			btnSearch.classList.add('search-active')
			searchInput.focus()
			if (window.visualViewport) {
				window.visualViewport.addEventListener('resize', onViewportResize)
			}
		}

		function closeSearch() {
			searchActive = false
			searchPanel.classList.remove('active')
			btnSearch.classList.remove('search-active')
			searchInput.value = ''
			searchResultsList.innerHTML = ''
			searchCountLabel.textContent = ''
			if (window.visualViewport) {
				window.visualViewport.removeEventListener('resize', onViewportResize)
			}
			toolbar.style.bottom = ''
			searchPanel.style.bottom = ''
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

		function performSearch() {
			var query = searchInput.value
			if (!query.trim()) {
				searchResultsList.innerHTML = ''
				searchCountLabel.textContent = ''
				return
			}
			var lowerQuery = query.toLowerCase()
			var matches = []
			for (var i = 0; i < allMessages.length; i++) {
				var msg = allMessages[i]
				var text = (msg.text || '').trim()
				if (text && text.toLowerCase().indexOf(lowerQuery) !== -1) {
					matches.push({ msg: msg, globalIdx: i, date: msg.timestamp.split(' ')[0] })
				}
			}
			searchCountLabel.textContent = matches.length > 0 ? matches.length + ' result' + (matches.length !== 1 ? 's' : '') : ''
			if (matches.length === 0) {
				searchResultsList.innerHTML = '<div class="search-empty-state">No messages found</div>'
				return
			}
			var html = ''
			for (var j = 0; j < matches.length; j++) {
				var m = matches[j]
				var timeLabel = escHtml(formatTimestamp(m.msg.timestamp))
				var sender = m.msg.isFromMe ? 'You' : 'Them'
				var snippet = buildSnippet(m.msg.text || '', query)
				html += '<div class="search-result-item" data-msg-id="msg-' + m.globalIdx + '" data-date="' + escHtml(m.date) + '">'
				html += '<div class="result-meta">' + sender + ' &middot; ' + timeLabel + '</div>'
				html += '<div class="result-text">' + snippet + '</div>'
				html += '</div>'
			}
			searchResultsList.innerHTML = html
		}

		searchResultsList.addEventListener('click', function (e) {
			var item = e.target.closest('.search-result-item')
			if (!item) return
			var date = item.dataset.date
			var msgId = item.dataset.msgId
			var dayIndex = sortedDates.indexOf(date)
			if (dayIndex === -1) return
			currentDayIndex = dayIndex
			renderDay(currentDayIndex, list)
			closeSearch()
			setTimeout(function () {
				var msgEl = document.getElementById(msgId)
				if (msgEl) {
					msgEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
					msgEl.classList.add('jump-highlight')
					setTimeout(function () {
						msgEl.classList.remove('jump-highlight')
					}, 2500)
				}
			}, 50)
		})

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

	initUI(list)

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

			groupMessagesByDate(messages)
			currentDayIndex = 0
			renderDay(currentDayIndex, list)
		})
		.catch(function (err) {
			console.error('[thread] fetch/parse error:', err)
			list.innerHTML =
				'<div style="padding:32px 20px;color:#c0392b;font-size:14px">Failed to load thread.json: ' +
				escHtml(String(err)) +
				'</div>'
		})
})()
