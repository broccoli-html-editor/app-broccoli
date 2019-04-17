new (function($, window){
	// Application
	var _this = this;
	window.app = this;
	this.px2style = window.px2style;

	// node.js
	this.process = process;

	this.cwd = process.cwd();

	// NW.js
	this.nw = nw;
	this.nwWindow = nw.Window.get();

	// jQuery
	this.$ = $;

	// package.json
	var _packageJson = require('../package.json');
	this.packageJson = _packageJson;

	// data
	var _path_data_dir = (process.env.HOME||process.env.LOCALAPPDATA) + '/'+_packageJson.pickles2.dataDirName+'/';


	/**
	 * Broccoli のバージョン情報を取得する。
	 *
	 * バージョン番号発行の規則は、 Semantic Versioning 2.0.0 仕様に従います。
	 * - [Semantic Versioning(英語原文)](http://semver.org/)
	 * - [セマンティック バージョニング(日本語)](http://semver.org/lang/ja/)
	 *
	 * *[ナイトリービルド]*<br />
	 * バージョン番号が振られていない、開発途中のリビジョンを、ナイトリービルドと呼びます。<br />
	 * ナイトリービルドの場合、バージョン番号は、次のリリースが予定されているバージョン番号に、
	 * ビルドメタデータ `+nb` を付加します。
	 * 通常は、プレリリース記号 `alpha` または `beta` を伴うようにします。
	 * - 例：1.0.0-beta.12+nb (=1.0.0-beta.12リリース前のナイトリービルド)
	 *
	 * @return string バージョン番号を示す文字列
	 */
	this.getVersion = function(){
		return _packageJson.version;
	}

	// utils
	var _utils79 = require('utils79');
	this.utils79 = _utils79;

	// filesystem
	var _fs = require('fs');
	this.fs = _fs;
	var _fsEx = require('fs-extra');
	this.fsEx = _fsEx;

	// Pickles 2
	var _px2dtLDA = new (require('px2dt-localdata-access'))(
		_path_data_dir,
		{
			"updated": function(updatedEvents){
				console.log('Px2DTLDA Data Updated:', updatedEvents);
			}
		}
	);
	this.px2dtLDA = _px2dtLDA;

	var _it79 = require('iterate79');
	this.it79 = _it79;

	var _nw_gui = require('nw.gui');
	var _appName = _packageJson.window.title;
	window.document.title = _appName;

	// Auto Updater
	var updater = (function(px){
		var Updater = require('./index_files/updater.js');
		return new Updater(px, $);
	})(this);
	this.updater = updater;

	/**
	 * アプリケーションの初期化
	 */
	function init(callback){
		_it79.fnc({},
			[
				function(it1){
					// updater: Installer Mode
					if( updater.isInstallerMode() ) {
						updater.doAsInstallerMode();
						return;
					}
					it1.next();
				},
				function(it1){
					// データディレクトリを初期化
					$('.splash__message p').text('データファイルを初期化中...');
					app.px2dtLDA.initDataDir(function(result){
						if( !result ){
							console.error('FAILED to Initialize data directory. - '+_path_data_dir);
						}

						app.px2dtLDA.save(function(){
							it1.next();
						});
					});
				},
				function(it1){
					// node-webkit の標準的なメニューを出す
					$('.splash__message p').text('メニューをセットアップ...');

					(function(){
						var win = _nw_gui.Window.get();
						var nativeMenuBar = new _nw_gui.Menu({ type: "menubar" });
						try {
							nativeMenuBar.createMacBuiltin( _appName );
							win.menu = nativeMenuBar;
						} catch (ex) {
							console.log(ex.message);
						}
					})();

					app.log( 'Application start;' );
					it1.next();
					return;
				},
				// function(it1){
				// 	// 各国語言語切替機能のロード
				// 	$('.splash__message p').text('各国語言語切替機能のロード...');
				// 	var LangBank = require('langbank');
				// 	app.lb = new LangBank( require('path').resolve('./app/common/language/language.csv'), function(){
				// 		app.lb.setLang(app.px2dtLDA.getLanguage());
				// 		// console.log(app.lb.get('welcome'));
				// 		it1.next();
				// 	}); // new LangBank()
				// 	return;
				// },
				function(it1){
					// db.json の読み込み
					$('.splash__message p').text('データを読み込んでいます...');
					app.load(function(){
						it1.next();
						return;
					}); // app.load()
					return;
				},
				function(it1){
					// ウィンドウ位置とサイズの初期化
					$('.splash__message p').text('ウィンドウ位置とサイズの初期化...');
					var db = app.px2dtLDA.getData();
					var winPosition = {
						"x": 0,
						"y": 0,
						"width": window.screen.width,
						"height": window.screen.height
					};
					try{
						if( typeof(db.extra.broccoli.windowPosition) === typeof({}) ){
							winPosition = db.extra.broccoli.windowPosition;
						}
					}catch(e){}
					app.nwWindow.moveTo(winPosition.x, winPosition.y);
					app.nwWindow.resizeTo(winPosition.width, winPosition.height);

					it1.next();
					return;
				},
				// function(it1){
				// 	// メニュー設定
				// 	$('.splash__message p').text('メニューを設定しています...');
				// 	var gmenu = require('./index_files/globalmenu.js');
				// 	_menu = new gmenu(px);
				// 	it1.next();
				// },
				function(it1){
					// 開発者のための隠しコマンド
					// Ctrl + Opt + R で トップフレームを再読込する
					$('.splash__message p').text('キーボードショートカット...');
					$(window).on('keypress', function(e){
						// console.log(e);
						if(e.keyCode == 18 && e.ctrlKey && e.altKey ){
							window.location.href='./index.html';
						}
					});
					it1.next();
				},
				function(it1){
					// HTMLコードを配置
					$('body').html( document.getElementById('template-outer-frame').innerHTML );
					px2style.header.init({"current":""});
					it1.next();
				},
				function(it1){
					// アプリの更新を自動チェック
					if( app.px2dtLDA.db.extra.broccoli.checkForUpdate == 'autoCheck' ){
						app.updater.checkNewVersion(function(error, newVersionExists, manifest){
							setTimeout(function(){
								if( error ){
									console.error('最新版の情報を取得できませんでした。通信状態のよい環境で時間をあけて再度お試しください。');
									return;
								}
								if ( newVersionExists ) {
									if( !confirm('新しいバージョンが見つかりました。'+"\n"+'・最新バージョン: '+manifest.version+"\n"+'・お使いのバージョン: '+app.packageJson.version+"\n"+'更新しますか？') ){
										return;
									}
									if( !confirm('アプリケーションの更新には、数分かかることがあります。'+"\n"+'更新中には作業は行なえません。'+"\n"+'いますぐ更新しますか？') ){
										return;
									}

									// 更新を実行する
									app.updater.update(manifest);
								}
							}, 3000);
						});
						it1.next();
						return;
					}
					it1.next();
				},

				function(it1){
					callback();
				}

			]
		);
		return;
	}

	/**
	 * DBをロードする
	 */
	this.load = function(callback){
		callback = callback || function(){};
		// db.json の読み込み・初期化
		app.px2dtLDA.load(function(){
			callback();
		})
		return;
	}

	/**
	 * DBを保存する
	 */
	this.save = function(callback){
		callback = callback || function(){};

		if( updater.isInstallerMode() ) {
			// インストールモード時には保存しない。
			// 上書きして破壊してしまう恐れがあるため。
			callback();
			return;
		}

		var db = app.px2dtLDA.getData();
		var winPosition = {
			"x": app.nwWindow.x,
			"y": app.nwWindow.y,
			"width": app.nwWindow.window.outerWidth,
			"height": app.nwWindow.window.outerHeight
		};

		db.extra = db.extra || {};
		db.extra.broccoli = db.extra.broccoli || {};
		db.extra.broccoli.windowPosition = winPosition;
		app.px2dtLDA.setData(db);

		app.px2dtLDA.save(function(){
			// プロジェクト別のアプリケーションデータを削除する
			var pjAll = app.px2dtLDA.getProjectAll();
			var pjAllIds = {};
			for(let idx in pjAll){
				pjAllIds[pjAll[idx].id] = true;
			}
			var baseDir = app.px2dtLDA.getAppDataDir('broccoli');
			var filelist = app.fs.readdirSync(baseDir);
			for(let idx in filelist){
				var filename = filelist[idx];
				var filenamePjId = filename.replace(/\.[a-zA-Z0-9]+$/g, '');
				try {
					if( !pjAllIds[filenamePjId] ){
						app.fs.unlinkSync(baseDir+'/'+filename);
					}
				} catch (e) {
				}
			}

			callback();
		});
		return;
	}


	/**
	 * ログをファイルに出力
	 */
	this.log = function( msg ){
		console.info(msg);
		return app.px2dtLDA.log(msg);
	}


	/**
	 * アプリケーションを終了する
	 */
	this.exit = function(){
		console.log( 'app.exit() called.' );
		app.save(function(){
			// if(!confirm('exit?')){return;}
			try {
				nw.App.quit();
			} catch (e) {
				console.error('Unknown Error on app.exit()');
			}
		});
	}

	/**
	 * イベントセット
	 */
	this.nwWindow.on( 'close', function(e){
		app.exit();
	});
	process.on( 'exit', function(e){
		app.log( 'Application exit;' );
	});
	process.on( 'uncaughtException', function(e){
		// alert('ERROR: Uncaught Exception');
		console.error('ERROR: Uncaught Exception');
		console.error(e);
		app.log( 'ERROR: Uncaught Exception' );
		app.log( e );
	} );


	/**
	 * アプリケーションを初期化
	 */
	$(window).on('load', function(){
		_it79.fnc({}, [
			function(it, arg){
				// init
				init(function(){
					it.next(arg);
				});
			} ,
			function(it, arg){
				it.next(arg);
			}
		]);

		window.focus();
	});

	return this;
})(jQuery, window);
