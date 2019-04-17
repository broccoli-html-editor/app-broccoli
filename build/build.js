var fs = require('fs');
var fsX = require('fs-extra');
var utils79 = require('utils79');
var it79 = require('iterate79');
var NwBuilder = require('nw-builder');
var packageJson = require('../package.json');
var isProductionMode = true;
var devManifestInfo = false;
var phpjs = require('phpjs');
var date = new Date();
var appName = packageJson.name;
var versionSign = packageJson.version;
var platforms = [
	'osx64',
	// 'win64',
	'win32',
	'linux64'
];
var APPLE_IDENTITY = null;
if( utils79.is_file( './apple_identity.txt' ) ){
	APPLE_IDENTITY = fs.readFileSync('./apple_identity.txt').toString();
	APPLE_IDENTITY = utils79.trim(APPLE_IDENTITY);
}

function pad(str, len){
	str += '';
	str = phpjs.str_pad(str, len, '0', 'STR_PAD_LEFT');
	return str;
}
function getTimeString(){
	var date = new Date();
	return date.getFullYear()+'-'+(date.getMonth()+1)+'-'+date.getDate()+' '+date.getHours()+':'+date.getMinutes()+':'+date.getSeconds();
}
function writeLog(row){
	fs.appendFile( __dirname+'/dist/buildlog.txt', row+"\n" ,'utf8', function(err){
		if(err){
			console.error(err);
		}
	} );
	console.log(row);
}

if( packageJson.version.match(new RegExp('\\+(?:[a-zA-Z0-9\\_\\-\\.]+\\.)?dev$')) ){
	isProductionMode = false;
}
if( !isProductionMode ){
	versionSign += '-'+pad(date.getFullYear(),4)+pad(date.getMonth()+1, 2)+pad(date.getDate(), 2);
	versionSign += '-'+pad(date.getHours(),2)+pad(date.getMinutes(), 2);
	packageJson.version = versionSign;
	if( packageJson.devManifestUrl ){
		packageJson.manifestUrl = packageJson.devManifestUrl;
	}
	// 一時的なバージョン番号を付与した package.json を作成し、
	// もとのファイルを リネームしてとっておく。
	// ビルドが終わった後に元に戻す。
	require('fs').renameSync('./package.json', './package.json.orig');
	require('fs').writeFileSync('./package.json', JSON.stringify(packageJson, null, 4));

	// 開発プレビュー版用の manifest ファイルを準備
	if( packageJson.manifestUrl ){
		devManifestInfo = {};
		devManifestInfo.manifest = {};
		devManifestInfo.manifest.name = appName;
		devManifestInfo.manifest.version = '9999.0.0'; // 常に最新になるように嘘をつく
		devManifestInfo.manifest.manifestUrl = packageJson.devManifestUrl;
		devManifestInfo.manifest.packages = {};

		if( devManifestInfo.manifest.manifestUrl.match(/^(https?\:\/\/[a-zA-Z0-9\.\/\-\_]+)\/([a-zA-Z0-9\.\_\-]+?)$/g) ){
			devManifestInfo.manifestBaseUrl = RegExp.$1 + '/';
			devManifestInfo.manifestFilename = RegExp.$2;
		}
	}
}


console.log('== build "'+appName+'" v'+versionSign+' ==');
if( !isProductionMode ){
	console.log('');
	console.log('****************************');
	console.log('* DEVELOPERS PREVIEW BUILD *');
	console.log('****************************');
	console.log('');
}

console.log('Cleanup...');
(function(base){
	var ls = fs.readdirSync(base);
	for(var idx in ls){
		if( ls[idx] == '.gitkeep' ){continue;}
		if( utils79.is_dir(base+'/'+ls[idx]) ){
			fsX.removeSync(base+'/'+ls[idx]);
		}else if( utils79.is_file(base+'/'+ls[idx]) ){
			fsX.unlinkSync(base+'/'+ls[idx]);
		}
	}
})( __dirname+'/dist/' );
console.log('');

writeLog( getTimeString() );

writeLog('Build...');
var nw = new NwBuilder({
	files: (function(packageJson){
		var rtn = [
			'./package.json',
			'./app/**/*',
			'./composer.json',
			'./vendor/autoload.php'
		];
		var nodeModules = fs.readdirSync('./node_modules/');
		for(var i in nodeModules){
			var modName = nodeModules[i];
			switch(modName){
				case '.bin':
				case 'node-sass':
				case 'gulp':
				case 'gulp-plumber':
				case 'gulp-rename':
				case 'gulp-sass':
				case 'nw':
				case 'nw-builder':
				case 'mocha':
				case 'spawn-sync':
				case 'px2style':
					// ↑これらは除外するパッケージ
					break;
				case 'broccoli-html-editor':
					// 必要なファイルだけ丁寧に抜き出す
					rtn.push( './node_modules/'+modName+'/package.json' );
					rtn.push( './node_modules/'+modName+'/node_modules/**' );
					rtn.push( './node_modules/'+modName+'/composer.json' );
					rtn.push( './node_modules/'+modName+'/vendor/**' );
					rtn.push( './node_modules/'+modName+'/client/dist/**' );
					rtn.push( './node_modules/'+modName+'/libs/**' );
					rtn.push( './node_modules/'+modName+'/fields/**' );
					rtn.push( './node_modules/'+modName+'/data/**' );
					break;
				default:
					// まるっと登録するパッケージ
					rtn.push( './node_modules/'+modName+'/**/*' );
					break;
			}
		}
		return rtn;
	})(packageJson) , // use the glob format
	version: '0.37.0',// <- version number of node-webkit
	flavor: 'sdk',
	macIcns: './app/common/images/appicon-osx.icns',
	winIco: './app/common/images/appicon-win.ico',
	zip: false,
	platforms: platforms
});

//Log stuff you want
nw.on('log',  writeLog);

// Build returns a promise
nw.build().then(function () {

	if( require('fs').existsSync('./package.json.orig') ){
		// 一時的なバージョン番号を付与した package.json を削除し、
		// もとのファイルに戻す。
		require('fs').renameSync('./package.json.orig', './package.json');
	}

	writeLog('all build done!');
	writeLog( getTimeString() );

	(function(){
		it79.fnc({}, [
			function(itPj, param){
				// macOS 版に 署名を追加する
				if( !APPLE_IDENTITY ){
					itPj.next(param);
					return;
				}
				writeLog('-- Apple Developer Certification:');
				writeLog(APPLE_IDENTITY);
				it79.ary(
					[
						'./build/'+appName+'/osx64/'+appName+'.app'
					],
					function(itPjSign, row, idx){
						var proc = require('child_process').spawn(
							'codesign',
							[
								'--deep',
								'-f',
								'-s', APPLE_IDENTITY,
								row
							],
							{}
						);
						proc.on('close', function(){
							writeLog('done! - ['+idx+'] '+row);
							itPjSign.next(param);
						});
					},
					function(){
						itPj.next(param);
					}
				);
			},
			function(itPj, param){
				// ZIP Apps.
				it79.ary(
					platforms,
					function(it2, platformName, idx){
						var zipFileName = appName+'-'+versionSign+'-'+platformName+'.zip';
						if( !isProductionMode && devManifestInfo ){
							var manifestPlatformName = platformName;
							switch( manifestPlatformName ){
								case "osx64":
								case "osx32":
									manifestPlatformName = "mac";
									break;
								case "win64":
								case "win32":
									manifestPlatformName = "win";
									break;
							}
							devManifestInfo.manifest.packages[manifestPlatformName] = {};
							devManifestInfo.manifest.packages[manifestPlatformName].url = devManifestInfo.manifestBaseUrl + zipFileName;
						}

						writeLog('[platform: '+platformName+'] Zipping...');
						process.chdir(__dirname + '/'+appName+'/'+platformName+'/');
						var proc = require('child_process').spawn(
							'zip',
							[
								'-q', '-y', '-r',
								'../../dist/'+zipFileName, '.'
							],
							{}
						);
						proc.on('close', function(){
							writeLog('success. - '+'./build/dist/'+zipFileName);
							process.chdir(__dirname);
							it2.next();
						});
					},
					function(){
						itPj.next(param);
					}
				);
			},
			function(itPj, param){
				if( !isProductionMode && devManifestInfo ){
					// manifest json を出力
					require('fs').writeFileSync(
						__dirname + '/dist/' + devManifestInfo.manifestFilename,
						JSON.stringify(devManifestInfo.manifest, null, 4)
					);
				}
				itPj.next(param);
			},
			function(itPj, param){
				writeLog('cleanup...');
				fsX.removeSync(__dirname+'/'+appName+'/');
				itPj.next(param);
			},
			function(itPj, param){
				writeLog( getTimeString() );
				writeLog('all zip done!');
				itPj.next(param);
			}
		]);

	})();

}).catch(function (error) {
	writeLog("ERROR:");
	writeLog(error);
	console.error(error);
});
