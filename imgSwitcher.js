/**
 * ImgSwitcher
 * Author: Takeshi Tomida <tomipetit@gmail.com>
 * ver. 2.0.2
 * require: jQuery
 */
export default class ImgSwicher {
	constructor(params) {
		let that = this;
		this.config = Object.assign({}, this.defaults(), params)
		if (!this.config.baseDom) {
			return false
		}
		this.config.maxPage = Math.ceil(
			this.config.baseDom.children().length / this.config.perPage
		) + this.config.maxPageOffset
		this.config.startPage = this.config.maxPage < this.config.startPage ? 1 : this.config.startPage
		this.config.page = this.config.startPage
		this.config.baseDom.attr({
			'data-page': this.config.startPage
		})
		this.config.baseDom.children().eq(this.config.startPage - 1).addClass('active')
		this.config.minPage = 1 + this.config.minPageOffset;
		this.setCursorAction()
		this.createPagination()
		this.setThumbnail()
		if (this.config.touch) {
			this.config.isTouch = 'ontouchstart' in window // タッチ端末判定
			if(this.config.isTouch){
				this.setTouch()
			}
		}
		this.config.pageSelectorObj = this.config.baseDom.siblings(this.config.pageSelector);
		if (this.config.autoChange && this.config.maxPage != this.config.startPage) {
			this.setAutoChange();
		}
		if (this.config.loop && this.config.changeMode !== 'fade') {
			let objs = this.config.baseDom.children()
			objs.each((idx, _obj) => {
				let clone = $(_obj).clone(true)
				this.config.baseDom.append(clone.addClass('after'))
			})

			$(objs.get().reverse()).each((idx, _obj) => {
				let clone = $(_obj).clone(true)
				this.config.baseDom.prepend(clone.addClass('before'))
			})
			//this.changePage(this.config.startPage)
		}

		// リサイズ時の処理
		this.resizeAction();

		setTimeout(() => {
			let imgPaths = this.config.baseDom.find('img').get().map(_obj => _obj.getAttribute('src'))
			this.preload(imgPaths)
				.then(() => {
					switch (this.config.changeMode) {
						case 'slide':
							this.config.scrollSize = this.config.baseDom.width()
							this.config.maxPos = this.config.scrollSize * this.config.maxPage
							this.config.baseDom.css({
								transition: this.config.transformStyle,
							})
							break
						case 'fade':
							break
					}
					this.changePage(this.config.startPage, true)
					this.config.contentLoaded()
				})
		}, 400)
	}
	/**
	 * 設定のデフォルト値
	 */
	defaults() {
		return {
			startPage: 1,
			perPage: 1,
			maxPageOffset: 0,
			minPageOffset: 0,
			cursorSelector: '.cursor',
			pageSelector: '.pages',
			thumbnailSelector: '.thumbnail',
			touch: true,
			transformStyle: 'transform 0.2s ease',
			autoChange: false,
			autoChangeTime: 5000,
			loop: false,
			changeMode: 'slide',
			changeBeforeFunc: () => { },
			changeAfterFunc: () => { },
			contentLoaded: () => { }
		}
	}
	/**
	 * 後ページへ移動
	 */
	nextPageAction() {
		let page = this.getThisPage()
		let nextPage
		if (page == this.config.maxPage) {
			nextPage = this.config.loop ? page + 1 : page
		} else {
			nextPage = page + 1
		}
		this.changePage(nextPage)
		/*
		this.changeBeforeFunc(page)
		let pos = -1 * (page - 1) * this.config.scrollSize
		this.config.baseDom.css('transform', `translateX(${pos}px)`)
		this.changePageCursor(page)
		this.changePagination(page)
		this.config.baseDom.attr({
			'data-page': page
		})
		this.changeAfterFunc(page)
		*/
	}
	/**
	 * 前ページへ移動
	 */
	prevPageAction() {
		let page = this.getThisPage()
		let prevPage
		if (page == this.config.minPage) {
			prevPage = this.config.loop ? page - 1 : page
		} else {
			prevPage = page - 1
		}
		this.changePage(prevPage)
		/*
		this.changeBeforeFunc(page)
		page--
		let pos = -1 * (page - 1) * this.config.scrollSize
		this.config.baseDom.css('transform', `translateX(${pos}px)`)
		this.changePageCursor(page)
		this.changePagination(page)
		this.config.baseDom.attr({
			'data-page': page
		})
		this.changeAfterFunc(page);
		*/
	}
	setAutoChange() {
		this.config.loop = true;
		this.config.timerId = setInterval(() => {
			this.nextPageAction()
		}, this.config.autoChangeTime)
	}
	/**
	 * カーソル動作をセット
	 */
	setCursorAction() {
		let that = this
		let cursorObj = this.config.baseDom.siblings(this.config.cursorSelector)
		cursorObj
			.children()
			.on('click', function () {
				if ($(this).hasClass('left')) {
					that.prevPageAction()
				}
				if ($(this).hasClass('right')) {
					that.nextPageAction()
				}
			})

		if (!this.config.loop && this.config.maxPage <= this.config.startPage) {
			cursorObj.find('.right').addClass('hide');
		}

		if (this.config.autoChange) {
			cursorObj.hover(
				() => {
					clearInterval(this.config.timerId);
				},
				() => {
					this.setAutoChange();
				}
			)
		}
	}
	/**
	 * ページネーションを生成
	 */
	createPagination() {
		let that = this
		const baseObj = this.config.baseDom.siblings(this.config.pageSelector)
		if (!baseObj || this.config.maxPage == 1) {
			return false
		}
		for (let i = 0; i < this.config.maxPage; i++) {
			const spanObj = $('<span />')
			if (i == 0) { // アクティブページを設定
				spanObj.addClass('active')
			}
			spanObj.on('click', function () {
				let page = baseObj.children().index(this) + 1
				that.changePage(page)
			})
			baseObj.append(spanObj)
		}
		return true
	}
	/**
	 * ページネーションを生成
	 */
	setThumbnail() {
		let that = this
		const baseObj = this.config.baseDom.siblings(this.config.thumbnailSelector)
		if (!baseObj.children().length) {
			return false
		}
		let thumbnails = baseObj.children()
		for (let i = 0; i < this.config.maxPage; i++) {
			thumbnails.eq(i).on('click', function () {
				let page = baseObj.children().index(this) + 1
				that.changePage(page)

			})
		}
		thumbnails.eq(this.config.startPage - 1).addClass('active')
		return true
	}
	/**
	 * 指定ページにジャンプする
	 * @param {ページナンバー} page 
	 */
	changePage(page, noAction = false) {

		let loop = false
		if (this.config.maxPage < page) {
			page = page - this.config.maxPage
			loop = true
		}
		if (page <= 0) {
			page = this.config.maxPage - page
			loop = true
		}
		this.changeBeforeFunc(page)
		this.config.baseDom.children().removeClass('active')
		switch (this.config.changeMode) {
			case 'slide':
				let pos = this.getPagePos(page, loop)
				if (pos === null) {
					return
				}
				if (loop) {
					// 移動の終了時にループ状態をリセットする

					this.config.baseDom.off().on("transitionend webkitTransitionEnd oTransitionEnd", e => {
						let pos = this.getPagePos(page)
						$(e.currentTarget)
							.css({
								transition: 'none',
								transform: `translateX(${pos}px)`,
							})
							.off("transitionend webkitTransitionEnd oTransitionEnd")
					})
				}else{
					this.config.baseDom.off()
				}

				let cssValues = {
					'transition': this.config.transformStyle,
					'transform': `translateX(${pos}px)`
				}
				if(noAction){
					cssValues.transition = 'none'
				}

				this.config.baseDom.css(cssValues)

				this.config.baseDom.children().not('.after').not('.before')
					.eq(page - 1).addClass('active')
				if(this.config.loop){
					this.config.baseDom.children().filter('.after').eq(page - 1).addClass('active')
					this.config.baseDom.children().filter('.before').eq(page - 1).addClass('active')
				}
				break
			case 'fade': {
				let activeDom = this.config.baseDom.children().not('.after').not('.before')
					.eq(page - 1)
				let prevDom = this.config.baseDom.children().not('.after').not('.before')
					.eq(this.config.page - 1)

				prevDom.addClass('prev-active')

				activeDom.off().on("transitionend webkitTransitionEnd oTransitionEnd", e => {
					prevDom.removeClass('prev-active')
				})
				activeDom.addClass('active')
				break
			}

		}
		this.changePageCursor(page)
		this.changePagination(page)
		this.config.page = page
		this.config.baseDom.attr({
			'data-page': page
		})
		this.config.baseDom.children().eq(page - 1).addClass('active')
		this.changeAfterFunc(page);
	}
	/**
	 * ページネーションの表示を更新
	 * @param {ページナンバー} page 
	 */
	changePagination(page) {
		const baseObj = this.config.baseDom.siblings(`${this.config.pageSelector},${this.config.thumbnailSelector}`)
		baseObj
			.find('.active')
			.removeClass('active')
			.end()
			.children()
			.eq(page - 1)
			.addClass('active')
	}
	/**
	 * ページのカーソル表示を更新
	 * @param {ページナンバー} page 
	 */
	changePageCursor(page) {
		let cursorObj = this.config.baseDom.siblings(this.config.cursorSelector)
		cursorObj.find('.right,.left').removeClass('hide')
		cursorObj.attr('data-page', '')
		if (!this.config.loop) {
			if (page == this.config.minPage) {
				cursorObj.find('.left').addClass('hide')
				//cursorObj.attr('data-page', 'first')
			}
			if (page >= this.config.maxPage) {
				cursorObj.find('.right').addClass('hide')
				//cursorObj.attr('data-page', 'last')
			}
		}
	}
	changeBeforeFunc(page) {
		return this.config.changeBeforeFunc(page);
	}
	changeAfterFunc(page) {
		return this.config.changeAfterFunc(page);
	}
	/**
	 * 現在のページ番号を取得
	 */
	getThisPage() {
		return Number(this.config.baseDom.attr('data-page'))
	}
	/**
	 * 現在のスクロール量をページ番号から取得
	 * @param {ページナンバー} page 
	 */
	getPagePos(page = null, loop = false) {
		if (!page) {
			page = this.getThisPage()
		}
		if (this.config.loop) {
			if (loop) {
				if (page == 1) {
					return -1 * (this.config.maxPage * 2) * this.config.scrollSize
				} else {
					return -1 * (page - 1) * this.config.scrollSize
				}
			} else {
				return -1 * (Number(this.config.maxPage) + Number(page) - 1) * this.config.scrollSize
			}
		} else {
			return -1 * (page - 1) * this.config.scrollSize
		}
	}
	/**
	 * 現在の時間をunixタイムで取得
	 */
	getThisTime() {
		const date = new Date()
		return date.getTime()
	}

	/**
	 * リサイズ時の処理
	 */
	resizeAction() {
		clearTimeout(this.config.resizeTimeoutId)

		$(window).on('resize.baseWindow', () => {
			// リサイズ中はautoChangeを止める
			if (this.config.autoChange) {
				clearTimeout(this.config.timerId);
			}
			switch (this.config.changeMode) {
				case 'slide':
					this.config.scrollSize = this.config.baseDom.width()
					this.config.maxPos = this.config.scrollSize * this.config.maxPage
					let page = this.getThisPage()
					//let pos = -1 * (page - 1) * this.config.scrollSize
					let pos = this.getPagePos(page)
					this.config.baseDom.css({
						transition: 'none',
						transform: `translateX(${pos}px)`,
					})
					// リサイズが終わったあとにtransitionとautoChangeを戻す
					this.config.resizeTimeoutId = setTimeout(() => {
						this.config.baseDom.css('transition', this.config.transformStyle)
						if (this.config.autoChange) {
							this.setAutoChange()
						}
					}, 200)
					break
				case 'fade':
					setTimeout(() => {
						if (this.config.autoChange) {
							this.setAutoChange()
						}
					}, 200)
					break
			}
		})
	}
	/**
	 * タッチ用設定
	 */
	setTouch() {
		let that = this
		// タッチ開始の処理
		this.config.baseDom.children().on('mousedown touchstart', e => {
			let touchEvent = e;
			this.config.baseDom.stop().css({ 'transition-property': 'none' })
			this.config.touchFlg = true
			let tmpData = {}
			let startX = event.changedTouches[0].pageX // X 座標の位置
			let startY = event.changedTouches[0].pageY // Y 座標の位置
			let totalMoveY = 0
			let startScrollPos = $(window).scrollTop()
			console.log("start:"+ startX)

			// 最初のページ、最終ページの移動時の重みを定義
			let prevWeight = this.getThisPage() == this.config.minPage && !this.config.loop ? 0.3 : 1;
			let nextWeight = this.getThisPage() == this.config.maxPage && !this.config.loop ? 0.3 : 1;
			tmpData.drag = true
			tmpData.lock = null
			tmpData.dragStartTime = this.getThisTime()
			let pagePos = this.getPagePos()

			// タッチの移動中処理
			$(document)
				.on('mousemove.slider touchmove.slider', e => {
					let moveObj = {}
					tmpData.moveX = event.changedTouches[0].pageX // X 座標の位置
					tmpData.moveLen = tmpData.moveX - startX
					let moveY = event.changedTouches[0].pageY // X 座標の位置
					let diffY = moveY - startY

					// 縦スクロール時は横移動しないようロックをかける
					if (tmpData.lock === null) {
						tmpData.lock = Math.abs(diffY) > Math.abs(tmpData.moveLen) ? false : true;
					}

					// 最初のページ、最終ページは移動に重みを加える
					if (tmpData.moveLen < 0) {
						tmpData.moveLen *= nextWeight;
					} else {
						tmpData.moveLen *= prevWeight;
					}
					tmpData.movePos = pagePos + tmpData.moveLen

					moveObj = { transform: `translateX(${tmpData.movePos}px)` }

					if (tmpData.lock) {
						e.preventDefault();
						this.config.baseDom.stop().css(moveObj)
					}
				})
				// タッチ終了の処理
				.one('mouseup touchend', e => {
					console.log("end:"+ tmpData.moveLen)
					let mode = null
					let page
					this.config.baseDom.stop().css({ 'transition-property': 'all' })
					if (!this.config.touchFlg) {
						return false
					}
					this.config.touchFlg = false
					tmpData.dragEndTime = this.getThisTime()

					$(document).off('mousemove.slider touchmove.slider')
					// スワイプ処理（移動距離とタッチ時間でスワイプ判定）
					let dragTime = tmpData.dragEndTime - tmpData.dragStartTime
					if (!tmpData.moveLen) {
						return true
					}
					if (
						dragTime < 300 && Math.abs(tmpData.moveLen) > 30) {
						if (tmpData.moveLen < 0) {
							mode = 'next'
						} else {
							mode = 'prev'
						}
					} else if (this.config.scrollSize / 2 < Math.abs(tmpData.moveLen)) {
						if (tmpData.moveLen < 0) {
							mode = 'next'
						} else {
							mode = 'prev'
						}
					} else {
						page = this.getThisPage()
					}
					switch (mode) {
						case 'next':
							this.nextPageAction()
							break
						case 'prev':
							this.prevPageAction()
							break
						default:
							this.changePage(page)
					}
				})
		})
	}
	// 画像の先読み関数
	preload(imgPathList) {
		return Promise.all(imgPathList.map(_path => {
			return new Promise((resolve, reject) => {
				let img = new Image()
				img.onload = () => {
					resolve();
				}
				img.onerror = () => {
					reject();
				}
				img.src = _path;
			})
		}))
	}
}
