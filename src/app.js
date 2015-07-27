/**
 * Welcome to OpenSprinkler Remote!
 *
 * first Version. Just to test. 
 *
 * Project Ideas:
 * - show the Sprinkler Programs in the queue
 * - 
 */

var UI = require('ui');
var ajax = require('ajax');
var Accel = require('ui/accel');
var Vibe = require('ui/vibe');
var Vector2 = require('vector2');

var debug = false;	//true;

var data_jc;	//Controller Variables
var data_jo;	//Options
var data_jn;	//Staition Names and Attributes

var error = false;
var StationMenu = [];
var StationIds	= [];
var RunningTime = 0;
var mode = '';
var option = '';
var TimeCard = new UI.Window();
var StMenu = new UI.Menu({
	sections: [{
		title: 'Manual Mode',
		//items: getStationMenu()
	}]
});
// Create a background Rect
var bgRect = new UI.Rect({
  position: new Vector2(10, 30),
  size: new Vector2(124, 100),
  backgroundColor: 'white',
	borderColor: 'clear'
});
var TimeCardTitle = new UI.Text({
  position: new Vector2(10, 20),
  size: new Vector2(124, 20),
  text: 'Station Name',
  font:'GOTHIC_28_BOLD',
  color:'black',
  textOverflow:'wrap',
  textAlign:'center',
  backgroundColor:'white'
});
var TimeCardTime = new UI.Text({
  position: new Vector2(10, 50),
  size: new Vector2(124, 50),
  text: RunningTime,
  font:'RESOURCE_ID_BITHAM_42_BOLD',
  color:'black',
  textOverflow:'wrap',
  textAlign:'center',
  backgroundColor:'white'
});
var TimeCardInfo = new UI.Text({
  position: new Vector2(10, 95),
  size: new Vector2(124, 20),
  text: 'time',
  //font:'GOTHIC_28_BOLD',
  color:'black',
  textOverflow:'wrap',
  textAlign:'center',
  backgroundColor:'white'
});

// Add Rect to Window
TimeCard.add(bgRect);
TimeCard.add(TimeCardTitle);
TimeCard.add(TimeCardTime);
TimeCard.add(TimeCardInfo);

Accel.init();

//settings object
var settings = {
	link : "",
	pass: "",
	name : "",
	save : function(){
		var i = 0;
		localStorage.setItem(i++,this.link);
		localStorage.setItem(i++,this.pass);
		localStorage.setItem(i++,this.name);
		if(debug){
			console.log("Save the Data.");
		}
	},
	load : function(){
		var i = 0;
		this.link = localStorage.getItem(i++);
		this.pass = localStorage.getItem(i++);
		this.name = localStorage.getItem(i++);
		if(debug){
			console.log("Load data:");
			console.log("Link: " + settings.link);
			console.log("Pass: " + settings.pass);
			console.log("Name: " + settings.name);
		}
	}	
};


//load the Setting at start up
settings.load();

var firstRun = true;
if(settings.pass !== ''){firstRun = false;}

// Create a Card with title and subtitle
var card = new UI.Card({
  title			: 'OpenSprinkler',
	subtitle	: (firstRun ? 'Welcome' : 'Loading...'),
	body			: (firstRun ? '\nPlease go the settings page.' : ''),
	scrollable: true,
	style			: 'small'
});


//event listener
Pebble.addEventListener("ready",
  function(e) {
		settings.load();
		if(debug){
			console.log("PebbleKit JS ready!");
		}
  }
);

function timezone(unixtimestamp){
	var offsetHour = (data_jo.tz - 48) /4 ;
	return unixtimestamp - (offsetHour * 60 * 60);	
}

function ts2date (unixtimestamp){
	var d = new Date(unixtimestamp*1000);
	//d.setTime(unixtimestamp);
	return d.getDate()+'.'+(d.getMonth()+1)+'.';
}

function ts2time (unixtimestamp){
	var d = new Date(unixtimestamp*1000);
	//d.setTime(unixtimestamp);
	if(d.getMinutes()<10){
		return d.getHours()+':0'+d.getMinutes();
	}else{
		return d.getHours()+':'+d.getMinutes();
	}
}

function min2time(min){
	var h = Math.floor(min%60);
	var m = Math.floor(min-(60*h));
	if(m<10){
		return h+':0'+m;
	}else{
		return h+':'+m;
	}	
}

//link to the config website
Pebble.addEventListener("showConfiguration",
  function(e) {
    //Load the remote config page
    Pebble.openURL("https://dl.dropboxusercontent.com/u/46109611/Pebble/opensprinkler/os1.html");
  }
);

Pebble.addEventListener("webviewclosed",
  function(e) {
    //Get JSON dictionary
    var configuration = JSON.parse(decodeURIComponent(e.response));
		if(debug){console.log("Configuration window returned: " + JSON.stringify(configuration));}

		settings.link = configuration.link;
		settings.pass = configuration.pass;
		settings.name = configuration.name;
		
		if(debug){
			console.log("set settins:");
			console.log("Name: " + settings.name);
			console.log("Link: " + settings.link);
			console.log("Pass: " + settings.pass);
		}
		
		//save the new Data
		settings.save();
		update();
  }
);

function getStationMenu() {
  StationIds = [];//clear StationIds
	var items = [];
	var row = 0;
	var check = 1;
    
	if(debug){console.log('creat stations');}
	
	for(var x = 0; x < (data_jc.nbrd*8); x++){
		row = Math.floor(x/8);		
		if(x%8 === 0){check=1;} //reset Check at the next row
		
			if(debug){console.log('Station '+x+' row: ' + row + ' ' + data_jn.snames[x]);}
		
		//compare the bit if Hide
		if(!(data_jn.stn_dis[row] & check)){
			var subtitle = null;
			//is running
			if(data_jc.sbits[row] & check){subtitle = 'running';}
			
			// Add to menu items array
			items.push({
				title: data_jn.snames[x],
				subtitle: subtitle
			});
			StationIds.push(x); //add the station ID to the StationsIds array
		}		
		check = check << 1; //go the next bit		
	}
	
	items.push({
				title: 'Stop all'
				//subtitle: 'some info'
			});
	
	// Finally return whole array	
  return items;
}

function show_error(){
	//show the error
	
	if(debug){console.log('Failed loading data: ' + error);}
	card.subtitle('ERROR:');
	card.body('No OpenSprinkler found. Please check the connection settings.');	
}

function show_result(){
	//show the results or error	
	
	if(isNaN(data_jc.result)){ //no error

		var now = new Date();

		card.subtitle(settings.name);
		card.body(
			'Status: ' + status(data_jc) + '\n\n' +
			//'Rain delay: ' + (data.rd == '0' ? 'no delay' : ts2date(data.rdst) + ' ' + ts2time(data.rdst) ) + '\n\n' +
			'Water Level: ' + data_jo.wl + '%\n\n' +
			'Last Run: ' + (data_jc.lrun[3] == '0' ? '-' : '' + getStationName(data_jc.lrun[0]) + '\n' +
											ts2date(timezone(data_jc.lrun[3])) + ' ' + ts2time(timezone(data_jc.lrun[3])) + ' (' + Math.round(data_jc.lrun[2]/60*10)/10 + ' min)' ) + '\n\n' +
			'Sunrise: ' + min2time(data_jo.sunrise) + '\n' +
			'Sunset: ' + min2time(data_jo.sunset) + '\n\n' +
			'last update: ' + ts2time(now/1000)
		);
		
		//generate the station menu
		//StationMenu = getStationMenu();
		StMenu.items(0, getStationMenu());

	}else{ //ERROR detected

		card.subtitle('ERROR:');
		switch(parseInt(data_jc.result)){
			case 2: 
				card.body('Unauthorized');
				break;
			case 3: 
				card.body('Missmath');
				break;
			case 16: 
				card.body('Data Missing');
				break;
			case 17: 
				card.body('Out of Range');
				break;
			case 18: 
				card.body('Data Format Error');
				break;
			case 32: 
				card.body('Page not found.');
				break;
			case 48: 
				card.body('Not Permitted');
				break;	
			default:
				card.body('Ups - something goes wrong.');
		}
	}
}

function get_jc(){
	
	var URL = 'http://' + settings.link + '/jc?pw=' + settings.pass;	
	return ajax(
			{
				url: URL,
				type: 'json'
			},
			function(data){
				if(debug){
					console.log("Successfully loading data!");
					console.log('Data: ' + JSON.stringify(data));
				}
				data_jc = data;
				//return data;
				get_jo();
			},
			function(error) {
				// Failure!
				error = true;
				show_error();
			}
		); //end ajax
}

function get_jo(){
	
	var URL = 'http://' + settings.link + '/jo?pw=' + settings.pass;	
	return ajax(
			{
				url: URL,
				type: 'json'
			},
			function(data){
				if(debug){
					console.log("Successfully loading data!");
					console.log('Data: ' + JSON.stringify(data));
				}
				data_jo = data;
				//return data;
				get_jn();
			},
			function(error) {
				// Failure!
				error = true;
				show_error();
			}
		); //end ajax
}

function get_jn(){	
	var URL = 'http://' + settings.link + '/jn?pw=' + settings.pass;	
	return ajax(
			{
				url: URL,
				type: 'json'
			},
			function(data){
				if(debug){
					console.log("Successfully loading data!");
					console.log('Data: ' + JSON.stringify(data));
				}
				data_jn = data;
				//return data;
				show_result();
			},
			function(error) {
				// Failure!
				error = true;
				show_error();
			}
		); //end ajax
}

function set_settings(){	//set controller var	
	
	var URL = 'http://' + settings.link + '/' + mode +'?pw=' + settings.pass;
	
	if(mode == 'cm'){
		if(StationIds.length > option){ //namal Stations
			if(RunningTime>0){ 
				option = 'sid=' + StationIds[option] + '&en=1&t=' + (RunningTime*60);
			}else{
				option = 'sid=' + StationIds[option] + '&en=0';
			}
			URL += '&' + option;
		}else{	//stopp all station
			//mode = 'cv';
			//option = 'rsn=1';
			URL = 'http://' + settings.link + '/cv?pw=' + settings.pass + '&rsn=1';
		}				
	}else{
		URL += '&' + option + '=' + RunningTime;	
	}	
	
	if(debug){console.log("Send data:" + URL);}
	
	ajax(
		{
			url: URL,
			type: 'json'
		},
		function(data){
			if(debug){
				console.log("Set data!");
				console.log('Data: ' + JSON.stringify(data));
			}
			update();
			Vibe.vibrate('short');
			TimeCard.hide();
			//Vibe.vibrate('short');
		},
		function(error) {
			// Failure!
		}
	); //end ajax
}

//the status function, check for errors and the currend activity ;) 
function status(data){
	
	//enabled
	if(data.en == '0'){ return 'OS disabled'; }
	//rain delay
	if(data.rd != '0'){ return 'rain delay\n' + 'until: ' + ts2date(timezone(data.rdst)) + ' ' + ts2time(timezone(data.rdst)); }
	//rain sensor
	if(data.rs != '0'){ return 'Rain sensor says its raining\n'; }
	//weather call check
	if(data.devt - data.lcwc > 7200){ return 'last weather update is to old (' + ts2date(timezone(data.lswc)) + ' ' + ts2time(timezone(data.lswc)) + ')'; }
	
	var station = '';
	for(var x = 0; x < data.sbits.length; x++){
		if(data.sbits[x] > 0){
			var check = 1;
			for(var y = 0; y < 8; y++){
				if(data.sbits[x] & check){ station += ((station !== '' ? ', ' : '') + getStationName(y+1+(8*x)));}
				check = check << 1;
			}
		}	
	}
	if(station !== ''){return '' + station + ' running';}
	
	return 'active - all fine';
}

// Construct Menu to show to user
var OsMenu = new UI.Menu({
  sections: [{
    title: settings.name,
		items: (0, [ { title: 'Set Rain Delay' }, { title: 'Manual Mode' } ])
  }]
});

OsMenu.on('select', function(e) {
  if(debug){
		console.log('Selected item #' + e.itemIndex + ' of section #' + e.sectionIndex);
		console.log('The item is titled "' + e.item.title + '"');
		console.log('stations: "' + StationMenu.toString());
	}
	if(e.itemIndex === 0){ //rain delay
		mode = 'cv';
		option = 'rd';
		TimeCardTitle.text('Rain delay');
		TimeCardInfo.text('hour');
		TimeCard.show();
	}
	if(e.itemIndex === 1){ //manual Mode
		StMenu.show();		
	}
});

StMenu.on('select', function(e) {
  if(debug){
		console.log('Selected item #' + e.itemIndex + ' of section #' + e.sectionIndex);
		console.log('The item is titled "' + e.item.title + '"');
		//console.log('stations: ' + StationMenu.toString());
	}
	
	mode = 'cm';
	option = e.itemIndex;
	
	if(StationIds.length > e.itemIndex ){
		//mode = 'cm';
		//option = e.itemIndex;
		TimeCardTitle.text(e.item.title);
		TimeCardInfo.text('min');
		TimeCard.show();
	}else{
		set_settings();
		StMenu.hide();
	}
});

TimeCard.on('click', 'select', function(e) {
	set_settings();
});

TimeCard.on('click', 'up', function(e) {
	if(RunningTime<(64800/60)){
		RunningTime++;
	}	
	TimeCardTime.text(RunningTime); 
});

TimeCard.on('click', 'down', function(e) {
	if(RunningTime>0){
		RunningTime--;
	}
	TimeCardTime.text(RunningTime); 
});

TimeCard.on('longClick', 'up', function(e) {
	RunningTime = RunningTime + 30;
	if(RunningTime>(64800/60)){
		RunningTime = (64800/60);
	}
	TimeCardTime.text(RunningTime); 
});

TimeCard.on('longClick', 'down', function(e) {
	RunningTime = RunningTime - 30;
	if(RunningTime<0){
		RunningTime = 0;
	}
	TimeCardTime.text(RunningTime); 
});

card.on('show', function(){
	update();
});

card.on('click', 'select', function() {
	if(debug){console.log('Click select!');}
	// Show the Menu, hide the splash
	OsMenu.show();
	//card.hide();
});

card.on('accelTap', function(e) {
  if(debug){console.log("Accel TAP");}
	Vibe.vibrate('short');
	update();
});

// Make the request
function update(){
	
	if(debug){console.log("Start update..");}	
	
	// Construct URL
	//var URL = 'https://dl.dropboxusercontent.com/u/46109611/OS/test.jc2';

	if(!firstRun){
		
		card.subtitle('Loading...');
		card.body('');
		
		get_jc(); 
		//call get_jc 
		//call get_jo
		//call get_jn
		//show results
	}else{
		card.title		= 'OpenSprinkler';
		card.subtitle	= 'Welcome';
		card.body			= '\nPlease go the settings page.';	
	}//end firstRun
}//end function

function getStationName(station){
	var len = data_jn.snames.length;
	if(len<station-1){
		return '';
	}	
	return data_jn.snames[station-1];	
}

// Display the Card
card.show();
update();
