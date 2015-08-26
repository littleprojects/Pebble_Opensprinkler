/**
 * Welcome to OpenSprinkler Remote!
 *
 * first Version. Just to test. v 1.2
 *
 * Project Ideas:
 * - show logs, calc runningtime for Progs and Stations (daily, weekly, monthly) - very complex
 * - show next planned run (look for the next scheduled progra) - mähhh
 * - bigger (bold) font for better reading (maybe as an option) 
 * - Info Menu wiht Version, Creator Name, Thanks too and bla bla
 * - count rain delay down
 * - check BT connection, vibe on disconnect
 * - more program info
 *
 * V 1.3
 * - add: update running Time (main page, station menu) counting down the time
 * - add: Main menu info of running and waiting stations, Rain delay, active Programs
 * - fix: dobble update at app start
 * - in progess..
 *
 * V 1.2 add features
 * - add: Run Programs Menu to run Test and Run-Once Progs
 * - add: show the Sprinkler Programs in the queue and running Time
 * - add: Menu for "reset Rain delay" and "Stop All"
 * - fix: bigger text on mainpage
 * - fix: rename "manual Mode" to "Run Stations" and place it at top in the menu
 * - add: funnny sayings on the "loading..." screen
 * - add: show Stations in the queue on the Mainepage
 *
 * V 1.1 bugfix
 * - fix: last run station name
 * - add: sunrise and sunset
 *
 * V 1.0 init release
 * - show status and running stations
 * - show water lever & last running station & last updatetime
 * - set rain delay in hours
 * - set stations manual on in minutes
 * - stop all station function
 */

var UI = require('ui');
var ajax = require('ajax');
var Accel = require('ui/accel');
var Vibe = require('ui/vibe');
var Vector2 = require('vector2');

var debug = true;	//true/false;

var data_jc;	//Controller Variables
var data_jo;	//Options
var data_jn;	//Staition Names and Attributes
var data_jp;	//Program Names and Attributes

var error = false;
var StationMenu = [];
var StationIds	= [];
//var stRun				= { station : [], dur : [] };			//array of running stations [name, time(sec)]
//var stWait			= { station : [], dur : [] };
var RunningTime = 0;//global URL RunningTime
var mode = '';			//global URL mode var			URL:Port/mode?pw=password&option=RunningTime
var option = '';		//global URL option var
var TimeCard = new UI.Window();
var SetCard = new UI.Window();
// MAIN Menu constructor

var StMenu = new UI.Menu({sections: [{title: 'Run Station'}]}); //station Menu
var PrgMenu = new UI.Menu({sections: [{title: 'Run Program'}]}); //Program Menu
var updateTime = '';
var LoadSpell = ['calculate Pi','polishing monocle','rendering cats','feeding cats','bending water','starting magic','kickstart engine','searching satellites','call Dr. How','drinking coffe','overtaking World',
								'licking ice cream','expanding the Universe','solving 0/0','counting stars','BAZINGA!','00100101 OK']; //'deleting internet',

var SetCardText = new UI.Text({
  position: new Vector2(10, 50),
  size: new Vector2(124, 50),
  text: 'Set Data',
  font:'RESOURCE_ID_GOTHIC_28_BOLD',
  color:'black',
  textOverflow:'wrap',
  textAlign:'center',
  backgroundColor:'white'
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
SetCard.add(SetCardText);
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

var OsMenu = new UI.Menu({
  sections: [{
    title: settings.name,
		items: (0, [ 
			{ title: 'Run Station' },
			{ title: 'Run Program' },
			{ title: 'Set Rain Delay', subtitle: '' }
		])
  },{
    title: 'action',
		items: (0, [ 
			{ title: 'Reset Rain Delay' },
			{ title: 'Stop all' }
		])
  }]
});

var firstRun = true;
if(settings.pass !== ''){firstRun = false;}

// Create a Card with title and subtitle
var card = new UI.Card({
  title			: 'OpenSprinkler',
	subtitle	: (firstRun ? 'Welcome' : 'Loading...'),
	body			: (firstRun ? '\nPlease go the settings page.' : ''),
	scrollable: true,
	style			: 'large' //small
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

function min2time(time){
	var h = Math.floor(time/60);
	var m = Math.floor(time-(60*h));
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

//Staion -Menu-generator
function getStationMenu() {
  StationIds = [];//clear StationIds
	var items = [];
	var row = 0;
	var check = 1;
    
	if(debug){console.log('creat stations');}
	
	for(var x = 0; x < (data_jc.nbrd*8); x++){
		row = Math.floor(x/8);		
		if(x%8 === 0){check=1;} //reset Check at the next row
		
			//if(debug){console.log('Station '+x+' row: ' + row + ' ' + data_jn.snames[x]);}
		
		//compare the bit if Hide
		if(!(data_jn.stn_dis[row] & check)){
			var subtitle = null;
			//is running
			
			
			if(data_jc.ps[x][1]>0){ //check if runtime>0
				if(data_jc.sbits[row] & check){ //check if running now
					subtitle = 'running';
				}else	{
					subtitle ='wait';
				}
				subtitle += ' (' +  Math.round(data_jc.ps[x][1]/60) + ' min)';
			}
			
			// Add to menu items array
			items.push({
				title: data_jn.snames[x],
				subtitle: subtitle
			});
			StationIds.push(x); //add the station ID to the StationsIds array
		}		
		check = check << 1; //go the next bit		
	}
		
	// Finally return whole array	
  return items;
} //create the Stations for the Manual Mode Menu

function getPrgMenu() {
	var items = [];
    
	if(debug){console.log('creat Programs');}
	
	//test run
	items.push({
				title: 'Test All Stations',
				subtitle: 'run all St. for 1 min'
			});
	
	for(var x = 0;x<data_jp.pd.length;x++){
			
			// Add to menu items array
			items.push({
				title: data_jp.pd[x][5],
				//subtitle: 'subtitle'
			});
	}
	
	//write result to the menu
	PrgMenu.items(0, items);
}	//create the Program Menu

//main Page
function show_error(){
	//show the error
	
	if(debug){console.log('Failed loading data: ' + error);}
	card.subtitle('ERROR:');
	card.body('No OpenSprinkler found. Please check the connection settings.');	
} //build the error Page

function show_result(){
	//show the results or error	
	
	if(isNaN(data_jc.result)){ //no error

		var now = new Date();

		card.subtitle(settings.name);
		card.body(
			'' + status(data_jc) + '\n\n' + //Status
			//'Rain delay: ' + (data.rd == '0' ? 'no delay' : ts2date(data.rdst) + ' ' + ts2time(data.rdst) ) + '\n\n' +
			'Water Level: ' + data_jo.wl + '%\n\n' +
			'Last Run: ' + (data_jc.lrun[3] == '0' ? '-' : '\n' + getStationName(data_jc.lrun[0] +1) + '\n' +
											ts2date(timezone(data_jc.lrun[3])) + ' ' + ts2time(timezone(data_jc.lrun[3])) + ' (' + Math.round(data_jc.lrun[2]/60*10)/10 + ' min)' ) + '\n\n' +
			'Sunrise: ' + min2time(data_jc.sunrise) + '\n' +
			'Sunset: ' + min2time(data_jc.sunset) + '\n\n' +
			'last update: ' + ts2time(now/1000)
		);
		
		//generate the station menu
		StMenu.items(0, getStationMenu());

	}else{ //ERROR detected

		card.subtitle('ERROR:');
		switch(parseInt(data_jc.result)){
			case 2: 
				card.body('Unauthorized\n\ncheck the password');
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
}	//build the Main Page

//ajax functions
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
}   //get controller vars -  calls jo

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
}		//get controller options - calls jn

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
				getStationStatus(); //fill the running Station array
				show_result(); //show the results
				get_jp(); //get program datas
			},
			function(error) {
				// Failure!
				error = true;
				show_error();
			}
		); //end ajax
}		//get names - calls result and jp

function get_jp(){	
	var URL = 'http://' + settings.link + '/jp?pw=' + settings.pass;	
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
				data_jp = data;

				getPrgMenu();
			},
			function(error) {
				// Failure!
				error = true;
				show_error();
			}
		); //end ajax
}		//get prgrams

function set_settings(){	//set controller var	
	
	SetCard.show();
	
	var URL = 'http://' + settings.link + '/' + mode +'?pw=' + settings.pass;
	
	if(mode == 'cm'){ //set station runtime
		if(StationIds.length > option){ //namal Stations
			if(RunningTime>0){ 
				option = 'sid=' + StationIds[option] + '&en=1&t=' + (RunningTime*60);
			}else{
				option = 'sid=' + StationIds[option] + '&en=0'; //station off
			}
			URL += '&' + option;
		}else{	//stopp all station
			URL = 'http://' + settings.link + '/cv?pw=' + settings.pass + '&rsn=1';
		}				
	}else if(mode == 'cr'){ //run Programms
		
		if(debug){console.log('start Run-Once Program ajax request ' + option);}
		
		var out = [];//[0,0,60,60,0,60,0,0];
		if(option === 0){  //TestProgramm
			//stations Ids //
			
			for(var x = 0; x < (data_jc.nbrd*8); x++){
				if(StationIds.indexOf(x) >= 0){  //is x in the StationIds?
					out.push(60); //add 60s
					if(debug){console.log('push: ' + x + ' - 60');}
				}else{
					out.push(0); //add 0s
					if(debug){console.log('push: ' + x + ' - 0');}
				}
				//URL += '&t=[' + out.toString() + ']';
			}
			
			//if(debug){console.log('out: &t=[' + out.toString() + ']');}
			URL += '&t=[' + out.toString() + ']';
			
		}else{ //Run Programs
			
			if(debug){console.log('push: ' + JSON.stringify(data_jp.pd[option-1][4]));}
			//out = JSON.stringify(data_jp.pd[option-1][4]);
			
			URL += '&t=' + JSON.stringify(data_jp.pd[option-1][4]) + '';
		}
		
		
	}else	{ //normal settings
		URL += '&' + option + '=' + RunningTime;	
	}	
	
	if(debug){console.log("Send data: " + URL);}
	
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
			SetCard.hide();
			//Vibe.vibrate('short');
		},
		function(error) {
			// Failure!
		}
	); //end ajax
} //call the ajax to set settingson the OpenSprinkler

//the status function, check for errors and the currend activity ;) 
function status(data){
	var text = false;
	var out = '';
	//enabled
	if(data.en == '0'){ out += '\nOS disabled'; text = true; }
	//rain delay
	if(data.rd != '0'){ 
		out += '\nrain delay ' + 'until: ' + ts2date(timezone(data.rdst)) + ' ' + ts2time(timezone(data.rdst)); text = true; 
		//OsMenu.sections[0].items[1][2].subtitle = 'is activ';
		OsMenu.item(0, 2, { subtitle: 'is activ until'  + ts2time(timezone(data.rdst))});
	}else{
		OsMenu.item(0, 2, { subtitle: '' });
	}
	//rain sensor
	if(data.rs != '0'){ out += '\nRain sensor says its raining\n'; text = true; }
	//weather call check
	if(data.devt - data.lcwc > 7200){ out += '\nlast weather update is to old (' + ts2date(timezone(data.lswc)) + ' ' + ts2time(timezone(data.lswc)) + ')'; text = true;}
	
	var reload = false;
	var pid = 0;
	var runCount = 0;
	var waitCount = 0;
	var row = 0;
	var check = 1;
	var StRun = '';
	var StWait = '';
	
	for(var x = 0; x < (data_jc.nbrd*8); x++){
		row = Math.floor(x/8);		
		if(x%8 === 0){check=1;} //reset Check at the next row
		
			//if(debug){console.log('Station '+x+' row: ' + row + ' ' + data_jn.snames[x]);}
		
		//compare the bit if Hide
		if(!(data_jn.stn_dis[row] & check)){		
			
			if(data_jc.ps[x][1]>0){ //check if runtime>0
				if(data_jc.sbits[row] & check){ //check if running now
					//subtitle = 'running';
					StRun += (StRun !== '' ? ', ' : '') + data_jn.snames[x] + ' (' +  Math.round(data_jc.ps[x][1]/60) + ' min)';
					reload = true; 
					runCount ++;
					pid = data_jc.ps[x][0];
				}else	{
					//subtitle ='wait';
					StWait += (StWait !== '' ? ', ' : '') + data_jn.snames[x] + ' (' +  Math.round(data_jc.ps[x][1]/60) + ' min)';
					waitCount ++;
				}
			}
		}		
		check = check << 1; //go the next bit		
	}
	
	var subtitle = '';		
	if(runCount>0){subtitle = runCount + ' station run';}
	if(runCount>0 && waitCount){subtitle +=  ', ';}
	if(waitCount>0){subtitle += waitCount + ' wait';}	
	OsMenu.item(0, 0, { subtitle: subtitle });
	
	//add running Staions	
	if(StRun !== ''){
		if(text){out += '\n\n';}
		out += '' + StRun + ' is running'; text = true;
	}
	
	//show program or manual mode
	subtitle = '';
	if( runCount > 0 ){
		if( pid > 0 && pid < 90){
			out += '\n' + data_jp.pd[pid][5] + ' active'; //data_jp.pd[pid][5]
			subtitle = '' + data_jp.pd[pid][5] + ' active';
		}else{			
			out += '\n- started manually';
		}
	}
	OsMenu.item(0, 1, { subtitle: subtitle });
	
	//add waiting Stations
	if(StWait !== ''){
		if(text){out += '\n\n';}
		out += '' + StWait + ' waiting'; text = true;
	}	
	
	//no status set - it will be all fine 
	if(!text){out = 'active - all fine';}
	
	if(reload){
		//show_result(); //update the cards and menus
		if(updateTime === ''){
			updateTime = setInterval(updateStationTime,10000); //do it again in 10 sec
		}
	}else{
		updateTime = ''; //stop the loop
	}
	
	return out;
}

OsMenu.on('select', function(e) {
  if(debug){
		console.log('Selected item #' + e.itemIndex + ' of section #' + e.sectionIndex);
		console.log('The item is titled "' + e.item.title + '"');
		console.log('stations: "' + StationMenu.toString());
	}
	switch(e.sectionIndex){
		case 0: //section 0
			
			switch(e.itemIndex){
				case 0:	//Run Station menu
					StMenu.show();
					break;
				case 1:	//Run Programs Menu
					PrgMenu.show();
					break;
				case 2:	//set Rain Delay Menu
					mode = 'cv';
					option = 'rd';
					TimeCardTitle.text('Rain delay');
					TimeCardInfo.text('hour');
					
					TimeCard.show();
					break;
				default: break;
			}
			
			break;
		case 1: //section action
			
			switch(e.itemIndex){
				case 0:	//resetet Rain Delay
					mode = 'cv';
					option = 'rd';
					RunningTime = 0;
					
					set_settings(); //send the command
					//OsMenu.hide(); //go back
					break;
				case 1:	//stop all
					mode = 'cv';
					option = 'rsn';
					RunningTime = 1;
					
					set_settings(); //send the command
					//OsMenu.hide();
					break;

				default: break;
			}
			
			break;
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
	
	if(StationIds.length > e.itemIndex ){ //show Timecard
		//mode = 'cm';
		//option = e.itemIndex;
		TimeCardTitle.text(e.item.title);
		TimeCardInfo.text('min');
		TimeCard.show();
	}else{ //stop all
		set_settings();
		StMenu.hide();
	}
});

PrgMenu.on('select', function(e) {
  if(debug){
		console.log('Selected item #' + e.itemIndex + ' of section #' + e.sectionIndex);
		console.log('The item is titled "' + e.item.title + '"');
		//console.log('stations: ' + StationMenu.toString());
	}
	
	mode = 'cr';  //start run one Program
	option = e.itemIndex;//e.itemIndex;
	
	set_settings();

	if(e.itemIndex === 0 ){ //Test Mode
		//mode = 'cm';
		//option = e.itemIndex;
		//TimeCardTitle.text(e.item.title);
		//TimeCardInfo.text('min');
		//TimeCard.show();
	}else{ //Programs
		
		//StMenu.hide();
	}
});  // Programm Menu

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
	//update();
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
	if(!firstRun){
		
		card.subtitle('Loading...');
		
		var textId = Math.floor((Math.random() * LoadSpell.length)); 
		
		card.body('\n' + LoadSpell[textId]);
		
		get_jc(); 
		//call get_jc 
		//call get_jo
		//call get_jn
		//show results
		//call get_jp
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

function getStationStatus(){
	
	/*
	var row = 0;
	var check = 1;
	
	stRun.station = [];
	stRun.dur = [];
	stWait.station = [];
	stWait.dur = [];
	
	for(var x = 0; x < (data_jc.nbrd*8); x++){
		row = Math.floor(x/8);		
		if(x%8 === 0){check=1;} //reset Check at the next row
		
			//if(debug){console.log('Station '+x+' row: ' + row + ' ' + data_jn.snames[x]);}
		
		//compare the bit if Hide
		if(!(data_jn.stn_dis[row] & check)){		
			
			if(data_jc.ps[x][1]>0){ //check if runtime>0
				if(data_jc.sbits[row] & check){ //check if running now
					//subtitle = 'running';
					//StRun += (StRun !== '' ? ', ' : '') + data_jn.snames[x] + ' (' +  Math.round(data_jc.ps[x][1]/60) + ' min)';
					stRun.station.push( data_jn.snames[x] );
					stRun.dur.push( data_jc.ps[x][1] );
				}else	{
					//subtitle ='wait';
					//StWait += (StWait !== '' ? ', ' : '') + data_jn.snames[x] + ' (' +  Math.round(data_jc.ps[x][1]/60) + ' min)';
					stWait.station.push( data_jn.snames[x] );
					stWait.dur.push( data_jc.ps[x][1]);
				}
			}
		}		
		check = check << 1; //go the next bit		
	}
	
	if(stRun.station.length > 0){
		updateTime = setInterval(updateStationStatus,10000);
	}else{
		updateTime = '';
	}
	*/
}

function updateStationTime(){
	
	var reload = false;
	var row = 0;
	var check = 1;
	
	for(var x = 0; x < (data_jc.nbrd*8); x++){
		row = Math.floor(x/8);		
		if(x%8 === 0){check=1;} //reset Check at the next row
		
			//if(debug){console.log('Station '+x+' row: ' + row + ' ' + data_jn.snames[x]);}
		
		//compare the bit if Hide
		if(!(data_jn.stn_dis[row] & check)){		
			
			if(data_jc.ps[x][1]>0){ //check if runtime>0
				if(data_jc.sbits[row] & check){ 
					//check if running now
					data_jc.ps[x][1] = data_jc.ps[x][1] - 10; // - 10 sec
					
					if(debug){console.log('---------> update Time: ' + x + ' ' + data_jn.snames[x]  + ' dur: ' + data_jc.ps[x][1] + ' = ' + Math.round(data_jc.ps[x][1]/60) + ' min' );}
					
					if(data_jc.ps[x][1] <= 0){
						data_jc.ps[x][1] = 0;
						//update = true;
						update();
					}
					reload = true;

					//StRun += (StRun !== '' ? ', ' : '') + data_jn.snames[x] + ' (' +  Math.round(data_jc.ps[x][1]/60) + ' min)';
				}else	{ 
					//waiting station					
					//StWait += (StWait !== '' ? ', ' : '') + data_jn.snames[x] + ' (' +  Math.round(data_jc.ps[x][1]/60) + ' min)';
				}
			}
		}		
		check = check << 1; //go the next bit		
	}
	
	if(reload){
		//updateTime = ''; //stop the loop
		show_result(); //update the cards and menus
		//updateTime = setInterval(updateStationTime,10000); //do it again in 10 sec
	}else{
		//updateTime = ''; //stop the loop
	}
	
	
	/*
	for(var x = 0; x < stRun.dur.length; x++){
		if( stRun.dur[x] >= 0 ){
			//stRun.dur[x] --;
			stRun.dur[x] = stRun.dur[x] - 10;
			
			if(debug){console.log('---------> update Time: ' + x + ' ' + stRun.station[x] + ' dur: ' + stRun.dur[x] + ' = ' + Math.round(stRun.dur[x]/60) + ' min' );}
			//update main card
			show_result();
			
			//update station menu
			
		}else{
			if(debug){console.log('---------> start Update:');}
			update();
			//getStationStatus();
		}
	}
	*/
}



// Display the Card
card.show();
update();
