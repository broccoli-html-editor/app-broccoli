module.exports = function( px, $ ) {
	var _this = this;

	var updateStatus = null;
	var gui = px.nw;
	var NwUpdater = require('node-webkit-updater');
	var upd = new NwUpdater(px.packageJson);

	/**
	 * 状態を確認する
	 */
	this.getUpdateStatus = function(){
		return updateStatus;
	}

	/**
	 * インストーラーモードかを判断する
	 */
	this.isInstallerMode = function(){
		// return true; // debug_mode

		if(gui.App.argv.length == 2) {
			return true;
		}
		return false;
	}

	/**
	 * 新しいバージョンがあるかどうか確認する
	 */
	this.checkNewVersion = function(callback){
		callback = callback || function(error, newVersionExists, manifest){
			if( error ){
				alert('最新版の情報を取得できませんでした。通信状態のよい環境で時間をあけて再度お試しください。');
				return;
			}
			if ( !newVersionExists ) {
				alert('お使いのアプリケーションは最新版です。');

			} else {
				if( !confirm('新しいバージョンが見つかりました。'+"\n"+'・最新バージョン: '+manifest.version+"\n"+'・お使いのバージョン: '+px.packageJson.version+"\n"+'更新しますか？') ){
					return;
				}
				if( !confirm('アプリケーションの更新には、数分かかることがあります。'+"\n"+'更新中には作業は行なえません。'+"\n"+'いますぐ更新しますか？') ){
					return;
				}

				// 更新を実行する
				_this.update(manifest);
			}
		};

		console.info('アプリケーションの更新を確認します。');
		console.log(px.packageJson);
		upd.checkNewVersion(function(error, newVersionExists, manifest) {
			if( error ){
				console.error(error);
			}else if( !newVersionExists ){
				console.info('お使いのアプリケーションは最新版です。');
			}else{
				console.info('新しいバージョンが見つかりました。'+"\n"+'・最新バージョン: '+manifest.version+"\n"+'・お使いのバージョン: '+px.packageJson.version);
			}
			console.log(manifest);

			callback(error, newVersionExists, manifest);
		});

		return;
	}

	/**
	 * 更新を実行する
	 * 
	 * インストーラーのダウンロードと展開を行います。
	 * 完了したら、インストーラーを起動してアプリを終了します。
	 */
	this.update = function(manifest){
		if( updateStatus !== null ){
			if(!confirm('現在アップデート処理は進行中です。'+"\n"+'Status: '+updateStatus+"\n\n"+'再実行しますか？')){
				return;
			}
		}

		// show progress bar
		px.progress.start({
			"blindness": true,
			"showProgressBar": true
		});

		updateStatus = 'downloading';
		console.info('インストーラーをダウンロードしています...。');
		console.log(manifest);
		px.progress.message('インストーラーをダウンロードしています...。');

		// 最新版のZIPアーカイブをダウンロード
		upd.download(function(error, filename) {
			if( error ){
				updateStatus = null;
				console.error(error);
				alert('[ERROR] 最新版パッケージのダウンロードに失敗しました。通信状態のよい環境で時間をあけて再度お試しください。');
				return;
			}

			updateStatus = 'unpacking';
			console.info('インストーラーアーカイブを展開しています...。');
			console.log(filename);
			px.progress.message('インストーラーアーカイブを展開しています...。');

			// ZIPを展開
			upd.unpack(filename, function(error, newAppPath) {
				if( error ){
					updateStatus = null;
					console.error(error);
					alert('[ERROR] 最新版パッケージの展開に失敗しました。ダウンロードしたパッケージが破損している可能性があります。');
					return;
				}

				updateStatus = 'booting_installer';
				console.info('インストールの準備が整いました。インストーラーを起動します。');
				px.progress.message('インストールの準備が整いました。インストーラーを起動します。');
				setTimeout(function(){
					upd.runInstaller(newAppPath, [upd.getAppPath(), upd.getAppExec()],{});
					px.exit();
					return;
				}, 3000);

			}, manifest);

		}, manifest);
	}


	/**
	 * インストーラーモードを処理する
	 */
	this.doAsInstallerMode = function(){
		// Args passed when new app is launched from temp dir during update

		var $body = $('body');

		updateStatus = 'installing';
		var copyPath = gui.App.argv[0];
		var execPath = gui.App.argv[1];
		if(!copyPath || !execPath){
			console.error('インストール先 または 再起動プログラム のパスがセットされていません。');
			if( !confirm('インストール先 または 再起動プログラム のパスがセットされていません。続行しますか？') ){
				return;
			}
		}

		px.it79.fnc({},
			[
				function(it1){
					console.log('Starting installation...');
					$body.html( $('#template-installer-mode').html() );
					$body.find('.installer-mode__appname').text(px.packageJson.window.title);
					$body.find('.installer-mode__version').text(px.packageJson.version);
					$body.find('.installer-mode__progress-msg').text('インストールしています...。');

					setTimeout(function(){
						it1.next();
					}, 3000);
				},
				function(it1){
					console.log('Starting copy application files...');
					if( !copyPath ){
						it1.next();
						return;
					}

					// Replace old app, Run updated app from original location
					// 本来 node-webkit-updater の作法では upd.install() を使うが、
					// これが mac でうまく動作しなかったため、 fsEx.copy() に置き換えた。
					px.fsEx.copy(upd.getAppPath(), copyPath, {"overwrite": true}, function(err) {
						console.log('Copy application files done.');

						if (err) {
							console.error(err);
							$('body').find('.installer-mode__progress-msg').text('[ERROR] アプリケーションの更新に失敗しました。アプリケーションファイルのコピーが失敗しました。');
							alert('[ERROR] アプリケーションの更新に失敗しました。アプリケーションファイルのコピーが失敗しました。');
							return;
						}

						it1.next();
					});

				},
				function(it1){
					updateStatus = null;
					console.log('Installation done.');
					$body.find('.installer-mode__progress-msg').text('アップデートが完了しました。');

					setTimeout(function(){
						alert('アップデートが完了しました。 アプリケーションを再起動します。');
						it1.next();
					}, 500);
				},
				function(it1){
					setTimeout(function(){
						it1.next();
					}, 1000);
				},
				function(it1){
					if( execPath ){
						console.log('Reboot App ...', execPath);
						upd.run(execPath, []);
					}

					px.exit();
				}
			]
		);

		return;
	}

	/**
	 * Updaterを取得する
	 */
	this.getUpdater = function(){
		return upd;
	}

};
