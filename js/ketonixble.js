'use strict';

// Sun Mar 12 19:51:17 CET 2017
// Copyright Ketonix AB
// Michel Lundell

console.log("loading nw.gui");
var gui = require('nw.gui');
console.log("finished loading nw.gui");
gui.App.clearCache();


var noble = null;
try {
	console.log("loading noble");
	noble = require("noble");
	console.log("finished loading noble");
} catch (err) {
	console.log("Loading noble:"+err);
	alert("Bluetooth will not work: "+err);
	noble = null;
}


// service: "092CB9A1-4CBE-475E-9F56-D29404DD29F1",
// level: "092CB9A1-4CBE-475E-9F56-D29404DD0003"

var ketonixBLE = {
    service: "092CB9A14CBE475E9F56D29404DD29F1",
    level: "092CB9A14CBE475E9F56D29404DD0003"
};

var bluetoothIsOn = false;
var lookForUsbDevice = true;
var uiCalibration = 0;
var theDeviceId = 0;
var firstFlag = true;
var secondFlag = true;
var ignoreZoom = true;
var zoomOn = false;
var currentProfile="";
var currentProfileId=-1;
var maxValue = 0;
var afterSave = true;
var daMaxValue = 0;
var lockMax = true;
var theDeviceId="";
var allProfiles=null;
var deviceType = 2;
var alreadyFound = false;

console.log("loading fs");
const fs = require('fs');
console.log("finished loading fs");

var viewport = {
    width  : $(window).width(),
    height : $(window).height(),
};

function DataPoint(x,y)
{
	console.log("DataPoint("+x+","+y+")");
	this.x = x;
	this.y = parseFloat(y);
	this.r = 1.0;
	return(this);
}

function Visconfigexp(theLabel)
{

	var dataSet = Array();
        dataSet[0] = new DataPoint("2017-05-01 12:00:00",2);
        dataSet[1] = new DataPoint("2017-05-02 13:00:00",1.2);
        dataSet[2] = new DataPoint("2017-05-03 14:00:00",3);
        dataSet[3] = new DataPoint("2017-05-04 15:00:00",4);

	var myVisconfig = {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    fill: false,
                    label: 'data',
                    data: dataSet ,
                    backgroundColor: '#FFFFFF',
                    borderColor: '#000000',
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    xAxes: [{
                        display: true,
                        type: 'time',
                        time: {
                                displayFormats: {
                                        day: 'YYYY-MM-DD HH:mm:ss'
                                }
                        }
                    }],
                    yAxes: [{
                        ticks: {
                            beginAtZero:true
                        }
                    }]
                }
            }
        };
	return( myVisconfig );
}

function Visconfig(theLabel)
{
	var visconfig = {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: theLabel,
                    borderColor: "rgba(0,0,255,0.7)",
		    borderWidth: 1,
                    fill: true,
		    lineTension: 0,
                    data: [],
                }]
            },
            options: {
                responsive: true,
                title:{
                    display:false,
                    text: "theLabel",
                },
                scales: {
                    xAxes: [{
                        display: true,
			type: 'time',
			time: {
				displayFormats: {
					day: 'LT'
				}
			} 
                    }],
                    yAxes: [{
                        display: true,
                        scaleLabel: {
                            display: false,
                            labelString: "ehh",
                        },
                    }]
                }
            }
        };
	return( visconfig );
}


function isNumber(value)
{
	console.log("isNumber("+value+")");
	var valid = !/^\s*$/.test(value) && !isNaN(value);
	console.log("valid = "+valid);
	return(valid);
}

var currentUnit = "PPM";
var saved_unit = "PPM";
var saved_green = 4;
var saved_yellow=30;
var saved_red = 80;

function createRadialGaugePPM(theunit)
{
	saved_unit = theunit; saved_green = 4; saved_yellow = 30; saved_red = 80;
	return (createRadialGauge(theunit,4,30,80));
}

function createRadialGaugeUnits(theunit,green, yellow, red)
{
	saved_unit = theunit; saved_green = green; saved_yellow = yellow; saved_red = red;
	return (createRadialGauge(theunit,green, yellow, red));
}

function recreateRadialGauge()
{
	console.log("createRadialGauge("+saved_unit+","+saved_green+","+ saved_yellow+","+ saved_red+")");
	return (createRadialGauge(saved_unit,saved_green, saved_yellow, saved_red));
}

function newGaugeRangeMax(theval)
{
	console.log("newGaugeRangeMax("+theval+")");
	return(createRadialGaugeMax(saved_unit, saved_green, saved_yellow, saved_red, 30) );
}

function createRadialGaugeMax(theval)
{
    var theval = 30;
    var theTicks = Array(theval/5);
    var i=0;
    for(i=0;i<theval;i += 5) theTicks[i] = ''+i;
    console.log("createRadialGaugeMax("+saved_unit+","+saved_green+","+saved_yellow+","+saved_red+","+theval+")");
    currentUnit = saved_unit;
    var anew = new RadialGauge({
            renderTo: 'gauge-ppm',
            width: (viewport.width > viewport.height ? viewport.height : viewport.width)*7/10,
            height: (viewport.width > viewport.height ? viewport.height : viewport.width)*7/10,
            units: saved_unit,
            title: false,
            value: 0,
            minValue: 0,
            maxValue: theval,
            // majorTicks: [ '0','10','20','30','40','50', '60','70','80','90','100' ],
            majorTicks: theTicks,
            minorTicks: 2,
            strokeTicks: false,
            highlights: [
                { from: 0, to: saved_green , color: 'rgba(0,0,200,.99)' },
                { from: saved_green , to: saved_yellow, color: 'rgba(0,255,0,.70)' },
                { from: saved_yellow, to: saved_red, color: 'rgba(255,255,0,.80)' },
                { from: saved_red, to: 100, color: 'rgba(255,0,0,.70)' },
            ],
            colorPlate: '#222',
            colorMajorTicks: '#f5f5f5',
            colorMinorTicks: '#ddd',
            colorTitle: '#fff',
            colorUnits: '#ccc',
            colorNumbers: '#eee',
            colorNeedleStart: 'rgba(240, 128, 128, 1)',
            colorNeedleEnd: 'rgba(255, 160, 122, .9)',
            valueBox: true,
            valueDec: 0,
            animationRule: 'bounce'
        });
        return(anew);
}

function highlight(fv,tv,cv)
{
	this.from = fv;
	this.to = tv;
	this.color = cv;
	return(this);
}

function createRadialGauge(theunit,green, yellow, red)
{
    var i=0;
    var theMaxValue = 30;
    var theMajorTicks = [ '5','10','15','20','25','30' ];
    var theHighlights =  [{ from: 0, to: green , color: 'rgba(0,0,200,.99)' }];

    console.log("createRadialGauge("+theunit+","+green+","+yellow+","+red+")"+(zoomOn?"Zoom on":"No Zoom"));

    currentUnit = theunit;

    if( currentUnit == "PPM" ) {
	    if( zoomOn == true ) {
			console.log("creating a 'PPM' gauge 0-10,("+green+","+yellow+","+red+")");
			theMaxValue = 10;
			theMajorTicks = [ '0','1','2','3','4','5', '6','7','8','9','10' ];
			// theHighlights: [{ from: 0, to: green , color: 'rgba(0,0,200,.99)' },
			// { from: green , to: 10, color: 'rgba(0,255,0,.70)' } ];
			theHighlights = Array();
			if(green >= 10) { theHighlights[0] = new highlight(0,green,'rgba(0,0,200,.99)'); }
			if(green < 10) { theHighlights[0] = new highlight(0,green,'rgba(0,0,200,.99)'); }
			if(green < 10 && yellow > 10) { theHighlights[1] = new highlight(green,10,'rgba(0,255,0,.70)'); }
			if(green < 10 && yellow < 10) { theHighlights[1] = new highlight(green,yellow,'rgba(0,255,0,.70)'); }
			if(yellow < 10 && red < 10) { theHighlights[2] = new highlight(yellow,red,'rgba(255,255,0,.80)'); }
			if(yellow < 10 && red < 10) console.log("yellow < 10 && red < 10 -> yellow ("+yellow+" to "+red+")");
			if(yellow < 10 && red > 10) { theHighlights[2] = new highlight(yellow,10,'rgba(255,255,0,.80)'); }
			if(red < 10) { theHighlights[3] = new highlight(red,10,'rgba(255,0,0,.70)'); }
	    } else {
		console.log("creating a 'PPM' gauge 0-100,("+green+","+yellow+","+red+")");
		theMaxValue = 100;
		theMajorTicks = [ '0','10','20','30','40','50', '60','70','80','90','100' ];
		theHighlights = Array();
		theHighlights[0] = new highlight(0,green,'rgba(0,0,200,.99)'); 
		theHighlights[1] = new highlight(green,yellow,'rgba(0,255,0,.70)'); 
		theHighlights[2] = new highlight(yellow,red,'rgba(255,255,0,.80)'); 
		theHighlights[3] = new highlight(red,100,'rgba(255,0,0,.70)'); 
	    }
    } else {
	console.log("creating a 'units' gauge 0-100");
	theMaxValue = 100;
	theMajorTicks = [ '0','10','20','30','40','50', '60','70','80','90','100' ];
	theHighlights = Array();
	theHighlights[0] = new highlight(0,green,'rgba(0,0,200,.99)'); 
	theHighlights[1] = new highlight(green,yellow,'rgba(0,255,0,.70)'); 
	theHighlights[2] = new highlight(yellow,red,'rgba(255,255,0,.80)'); 
	theHighlights[3] = new highlight(red,100,'rgba(255,0,0,.70)'); 
    }

    var anew = new RadialGauge({
            renderTo: 'gauge-ppm',
            width: (viewport.width > viewport.height ? viewport.height : viewport.width)*7/10,
            height: (viewport.width > viewport.height ? viewport.height : viewport.width)*7/10,
            units: theunit,
            title: false,
            value: 0,
            minValue: 0,
            maxValue: theMaxValue,
            majorTicks: theMajorTicks,
            minorTicks: 2,
            strokeTicks: false,
            highlights: theHighlights,
            colorPlate: '#222',
            colorMajorTicks: '#f5f5f5',
            colorMinorTicks: '#ddd',
            colorTitle: '#fff',
            colorUnits: '#ccc',
            colorNumbers: '#eee',
            colorNeedleStart: 'rgba(240, 128, 128, 1)',
            colorNeedleEnd: 'rgba(255, 160, 122, .9)',
            valueBox: true,
            valueDec: 1,
            animationRule: 'bounce'
        });
        return(anew);
}

var gaugePPM = createRadialGauge(currentUnit,4,30,80);
var cal_prev_raw = 0;
var cal_time = 0;

/*
var gaugePPM = new RadialGauge({
    renderTo: 'gauge-ppm',
    width: (viewport.width > viewport.height ? viewport.height : viewport.width)*6/10,
    height: (viewport.width > viewport.height ? viewport.height : viewport.width)*6/10,
    units: 'PPM',
    title: false,
    value: 0,
    minValue: 0,
    maxValue: 100,
    majorTicks: [
	'0','10','20','30','40','50',
	'60','70','80','90','100'
    ],
    minorTicks: 2,
    strokeTicks: false,
    highlights: [
	{ from: 0, to: 4, color: 'rgba(0,0,200,.99)' },
	{ from: 4, to: 30, color: 'rgba(0,255,0,.70)' },
	{ from: 30, to: 80, color: 'rgba(255,255,0,.80)' },
	{ from: 80, to: 100, color: 'rgba(255,0,0,.70)' },
    ],
    colorPlate: '#222',
    colorMajorTicks: '#f5f5f5',
    colorMinorTicks: '#ddd',
    colorTitle: '#fff',
    colorUnits: '#ccc',
    colorNumbers: '#eee',
    colorNeedleStart: 'rgba(240, 128, 128, 1)',
    colorNeedleEnd: 'rgba(255, 160, 122, .9)',
    valueBox: true,
    valueDec: 0,
    animationRule: 'bounce'
});
*/

console.log("loading os");
var os = require('os');
console.log("finished loading os");
if( os.platform() == "darwin" ) console.log("macOS");

var blowfish = new Blowfish("5cfd1a58d4fb6aa26cd40912b78fc815");
console.log("loading sqlite3");
//var db = require('sqlite3').verbose();
console.log("finished loading sqlite3");

var hid = null;
var device = null;

console.log("NOT loading node-hid");
hid = require('node-hid');
console.log("NOT finished loading node-hid");

var app = {

    initialize: function() {

	// alert('hepp');
        console.log("Let's Roll!");

        this.bindEvents();

	this.checkVersion();

        this.showHomePage();

	this.initGauge();

	mobiscroll.settings = {
	    theme: 'mobiscroll',
	};

	// mobiscroll
	// Use the settings object to change the theme

	    var cbAllow = $('.md-allow'),
		stepperLuggage = $('.md-luggage'),
		stepperCons = $('.md-consumption'),
		numpadCons = $('.md-numpad');

	    cbAllow.change(function () {
		stepperLuggage.prop('disabled', !this.checked);
	    });

	    numpadCons.mobiscroll().numpad({ 
		theme: 'mobiscroll',
		preset: 'decimal',
		min: 5,
		max: 120,
		onSet: function (event, inst) {
		    stepperCons.mobiscroll('setVal', event.valueText);
		}
	    }).mobiscroll('setVal', stepperCons.val());

	    numpadCons.mobiscroll('tap', stepperCons, function () {
		numpadCons.mobiscroll('show');
	    });

	    stepperCons.change(function () {
		numpadCons.mobiscroll('setVal', stepperCons.val());
	    });

	// mobiscroll
	

	// $("#save-measure-button-pos").css({ top: '90px',  right: '30px', position: 'absolute' });

	// $("#gaugeDiv").css({ top: '-50px', position: 'relative' });

	$("#profile-gender").flipswitch();
	$("#profile-smoker").checkboxradio();
	$("#profile-donate").checkboxradio();
	$("#profile-usage").selectmenu();
	$("#add-edit-profile").collapsible();
	$("#profile-autocomplete").prop("data-icon","alert");

	$("#profile-autocomplete").change( function() {
		console.log("profile-autocomplete.change()");
		if( $("#profile-autocomplete").val() == "" ) {
			$('#profile-button').buttonMarkup({ icon: "alert" });
			currentProfileId=-1;
			$("#select-profile-anchor").text("Select a profile");
			$("#select-profile-anchor").html("Select a profile");
			$("#select-profile-anchor").trigger("refresh");
		} else {
			$('#profile-button').buttonMarkup({ icon: "user" });
		}
	});

	$("#data-timestamp").mobiscroll().datetime({
		dateFormat: "yyyy-mm-dd",
		theme: 'mobiscroll', 
		timeFormat: 'HH:ii',
        	timeWheels: 'HHii',
		steps: { 
		    minute: 5,
		    second: 5,
		    zeroBased: true
		}
    	});


	$("#analyze-from").mobiscroll().calendar({
        	theme: 'mobiscroll',
		dateFormat: "yyyy-mm-dd"
    	});

	$("#analyze-to").mobiscroll().calendar({
        	theme: 'mobiscroll',
		dateFormat: "yyyy-mm-dd"
    	});

	$("#reset-demo-data-button").on("click",function() {
		console.log("reset-demo-data-button.click()");
    		app.resetDemoData();
		app.reloadProfiles();
		app.selectLastUsedProfile();
		$( "#data-panel" ).panel( "close");
	});

	$("#support-info-button").on("click",function() {
		// READ KETONIX IF INITIALIZED HEREMICHEL
		// ENCRYPT DATA AND DISPLAY IT TO BE SENT BY THE USER
		try {
			device.write([0x00,0x37]);
			device.read(function updateIt(err,data) {
				if( data != undefined ) { 
					var val = (data[1] + (data[2] << 8));
					var raw = (data[3] + (data[4] << 8));
					var warm = (data[5] + (data[6] << 8));
					var green = (data[7] + (data[8] << 8))/10;
					var yellow = (data[9] + (data[10] << 8))/10;
					var red = (data[11] + (data[12] << 8))/10;
					var cal = (data[13] + (data[14] << 8));
					var type = (data[15] + (data[16] << 8));
					console.log("SUPPORT INFO");
					console.log("val="+val);
					console.log("raw="+raw);
					console.log("warm="+warm);
					console.log("green="+green);
					console.log("yellow="+yellow);
					console.log("red="+red);
					console.log("cal="+cal);
					console.log("type="+type);
				}
			});
		} catch (err) {

		}
	});

	$("#close-edit-data-points-button").on("click",function() {
		console.log("close-edit-data-points-button.click()");
    		app.reloadDiagrams();
	});

	$("#edit-data-points-page").unload(function() {
		console.log("edit-data-points-page.unload()");
    		app.reloadDiagrams();
	});

	var aweekago = new Date();
	aweekago.setDate( aweekago.getDate() - 7 );

	// SET FORM DATES
	$("#analyze-from").val(aweekago.format("%Y-%m-%d"));
	$("#analyze-from").on("change", app.reloadDiagrams);

	$("#analyze-to").val(new Date().format("%Y-%m-%d"));
	$("#analyze-to").on("change", app.reloadDiagrams);

	$("#data-timestamp").val(new Date().format("%Y-%m-%d %H:%M"));


	$("#edit-data-point-list").mobiscroll().listview({
		stages: [ 
			{ percent: -20, color: 'red', icon: 'remove', text: 'Remove', action: function (event, inst) {
				console.log("swipe remove item");
                		inst.remove(event.target);
                		return false;
            		} }
		],
		onItemRemove: function(event,inst) {
			console.log("onItemRemove()");
               		var dp = event.target.getAttribute('data-id');
			console.log("delete a datapoint "+dp);
			app.deleteDataPoint(dp);
		}
	});

	$("#autocomplete-list").listview();

	// PREVIOUS


	$("#save-exercise-button").on("click",function() {
		console.log("saving body values");

		var timestamp = $("#data-timestamp").val();
		if( timestamp == "" ) {
			console.log("invalid data-timestamp");
			return;
		}
		console.log("timestamp = "+timestamp);
	
		var v = $("#exercise-length"  ).val();
		if( isNumber(v) ) app.saveDataTime(timestamp,"exercise-length"  ,v);
		v = $("#exercise-calories"  ).val();
		if( isNumber(v) ) app.saveDataTime(timestamp,"exercise-calories"  ,v);
		v = $("#exercise-intensity option:selected" ).val();
		if( isNumber(v) ) app.saveDataTime(timestamp,"exercise-intensity"  ,v);
		v = $("#exercise-type option:selected" ).val();
		if( isNumber(v) ) app.saveDataTime(timestamp,"exercise-type"  ,v);
		v = $("#exercise-fun option:selected" ).val();
		if( isNumber(v) ) app.saveDataTime(timestamp,"exercise-fun"  ,v);
	
		$( "#data-panel" ).panel( "close");
	});


	$("#save-body-measures-button").on("click",function() {
		console.log("saving body values");

		var timestamp = $("#data-timestamp").val();
		if( timestamp == "" ) {
			console.log("invalid data-timestamp");
			return;
		}
		console.log("timestamp = "+timestamp);
	
		var v = $("#body-height"  ).val();
		if( isNumber(v) ) app.saveDataTime(timestamp,"body-height"  ,v);
	
		v = $("#body-neck"  ).val();
		if( isNumber(v) ) app.saveDataTime(timestamp,"body-neck"  ,v);
	
		v = $("#body-upper-arm"  ).val();
		if( isNumber(v) ) app.saveDataTime(timestamp,"body-upper-arm"  ,v);
	
		v = $( "#body-chest" ).val();
		if( isNumber(v) ) app.saveDataTime(timestamp,"body-chest"  ,v);
	
		v = $( "#body-waist" ).val();
		if( isNumber(v) ) app.saveDataTime(timestamp, "body-waist" ,v);
	
		v = $( "#body-hips" ).val();
		if( isNumber(v) ) app.saveDataTime(timestamp, "body-hips" ,v);
	
		v = $( "#body-thigh" ).val();
		if( isNumber(v) ) app.saveDataTime(timestamp, "body-thigh" ,v);
	
		v = $( "#body-calf" ).val();
		if( isNumber(v) ) app.saveDataTime(timestamp, "body-calf" ,v);
	
		v = $( "#body-weight" ).val();
		if( isNumber(v) ) app.saveDataTime(timestamp, "body-weight" ,v);
	
		v = $( "#body-fat" ).val();
		if( isNumber(v) ) app.saveDataTime(timestamp, "body-fat" ,v);

		$( "#data-panel" ).panel( "close");
	});


	$("#save-meal-button").on("click", function() {
		console.log("saving meal values");
	
		var caloriesIn = 0;

		var timestamp = $("#data-timestamp").val();
		if( timestamp == "" ) {
			console.log("invalid data-timestamp");
			return;
		}
		console.log("timestamp = "+timestamp);
	
        	// caloriesAmount = fatAmount*9 + proteinAmount*4 + carbAmount*4;
		var v_fat = $("#meal-fat" ).val();
		if( isNumber(v_fat) ) {
			app.saveDataTime(timestamp,"meal-fat" ,v_fat);
			caloriesIn += v_fat * 9;
		}
		
		var v_protein = $("#meal-protein" ).val();
		if( isNumber(v_protein) ) {
			app.saveDataTime(timestamp,"meal-protein" ,v_protein);
			caloriesIn += v_protein * 4;
		}
		
		var v_carb = $("#meal-carb" ).val();
		if( isNumber(v_carb) ) {
			app.saveDataTime(timestamp,"meal-carb" ,v_carb);
			caloriesIn += v_carb * 4;
		}

		if(isNumber(v_fat) && isNumber(v_protein) && isNumber(v_carb)) {
			console.log("found fat,protein and carbs, calculating ratio");
        		var keto_ratio = (v_fat*0.9 + v_protein*0.46) / (v_fat*0.1+v_protein*0.54+v_carb);
			console.log("ratio = "+keto_ratio);
			app.saveDataTime(timestamp,"meal-keto-ratio" ,keto_ratio);
		}

		if( caloriesIn > 0 ) {
			app.saveDataTime(timestamp,"meal-calories" ,caloriesIn);
		}

		
		var v = $("#meal-water" ).val();
		if( isNumber(v) ) app.saveDataTime(timestamp,"meal-water" ,v);
		
		v = $("#meal-alcohol" ).val();
		if( isNumber(v) ) {
			app.saveDataTime(timestamp,"meal-alcohol" ,v);
		}


		$( "#data-panel" ).panel( "close");
	});

	$("#save-blood-button").on("click", function() {

		console.log("saving blood values");

		var timestamp = $("#data-timestamp").val();
		if( timestamp == "" ) {
			console.log("invalid data-timestamp");
			return;
		}
		console.log("timestamp = "+timestamp);

		var v = $("#blood-ldl-p").val();
		if( isNumber(v) ) app.saveDataTime(timestamp,"blood-ldl-p",v);
		v = $("#blood-small-ldl-p").val();
		if( isNumber(v) ) app.saveDataTime(timestamp,"blood-small-ldl-p",v);
		v = $("#blood-ldl-c").val();
		if( isNumber(v) ) app.saveDataTime(timestamp,"blood-ldl-c",v);
		v = $("#blood-hdl-c").val();
		if( isNumber(v) ) app.saveDataTime(timestamp,"blood-hdl-c",v);
		v = $("#blood-triglycerides").val();
		if( isNumber(v) ) app.saveDataTime(timestamp,"blood-triglycerides",v);
		v = $("#blood-total-cholesterol").val();
		if( isNumber(v) ) app.saveDataTime(timestamp,"blood-total-cholesterol",v);
		v = $("#blood-vldl").val();
		if( isNumber(v) ) app.saveDataTime(timestamp,"blood-vldl",v);
		v = $("#blood-systolic").val();
		if( isNumber(v) ) app.saveDataTime(timestamp,"blood-systolic",v);
		v = $("#blood-diastolic").val();
		if( isNumber(v) ) app.saveDataTime(timestamp,"blood-diastolic",v);
		v = $("#blood-pulse").val();
		if( isNumber(v) ) app.saveDataTime(timestamp,"blood-pulse",v);
		v = $("#blood-beta-hydroxybutyrate").val();
		if( isNumber(v) ) app.saveDataTime(timestamp,"blood-beta-hydroxybutyrate",v);
		v = $("#blood-glucose").val();
		if( isNumber(v) ) app.saveDataTime(timestamp,"blood-glucose",v);

		$( "#data-panel" ).panel( "close");
	});




	$("#blood-glucose-checkbox").on("change",function() {
		console.log("on change");
		if( $("#blood-glucose-checkbox").is(":checked") ) {
			console.log("showDiagram(blood-glucose)");
			app.showDiagram("blood-glucose","Blood Glucose");
		} else {
			console.log("hideDiagram(blood-glucose)");
			app.hideDiagram("blood-glucose");
		}
	});

	$("#blood-beta-hydroxybutyrate-checkbox").on("change",function() {
		console.log("on change");
		if( $("#blood-beta-hydroxybutyrate-checkbox").is(":checked") ) {
			console.log("showDiagram(blood-beta-hydroxybutyrate)");
			app.showDiagram("blood-beta-hydroxybutyrate","Blood Beta-HydroxyButyrate");
		} else {
			console.log("hideDiagram(blood-beta-hydroxybutyrate)");
			app.hideDiagram("blood-beta-hydroxybutyrate");
		}
	});

	$("#blood-pulse-checkbox").on("change",function() {
		console.log("on change");
		if( $("#blood-pulse-checkbox").is(":checked") ) {
			console.log("showDiagram(blood-pulse)");
			app.showDiagram("blood-pulse","Blood Pulse");
		} else {
			console.log("hideDiagram(blood-pulse)");
			app.hideDiagram("blood-pulse");
		}
	});

	$("#blood-diastolic-checkbox").on("change",function() {
		console.log("on change");
		if( $("#blood-diastolic-checkbox").is(":checked") ) {
			console.log("showDiagram(blood-diastolic)");
			app.showDiagram("blood-diastolic","Blood Diastolic Pressure");
		} else {
			console.log("hideDiagram(blood-diastolic)");
			app.hideDiagram("blood-diastolic");
		}
	});


	$("#blood-systolic-checkbox").on("change",function() {
		console.log("on change");
		if( $("#blood-systolic-checkbox").is(":checked") ) {
			console.log("showDiagram(blood-systolic)");
			app.showDiagram("blood-systolic","Blood Systolic Pressure");
		} else {
			console.log("hideDiagram(blood-systolic)");
			app.hideDiagram("blood-systolic");
		}
	});

	$("#blood-vldl-checkbox").on("change",function() {
		console.log("on change");
		if( $("#blood-vldl-checkbox").is(":checked") ) {
			console.log("showDiagram(blood-vldl)");
			app.showDiagram("blood-vldl","Blood VLDL");
		} else {
			console.log("hideDiagram(blood-vldl)");
			app.hideDiagram("blood-vldl");
		}
	});


	$("#blood-total-cholesterol-checkbox").on("change",function() {
		console.log("on change");
		if( $("#blood-total-cholesterol-checkbox").is(":checked") ) {
			console.log("showDiagram(blood-total-cholesterol)");
			app.showDiagram("blood-total-cholesterol","Blood Total Cholesterol");
		} else {
			console.log("hideDiagram(blood-total-cholesterol)");
			app.hideDiagram("blood-total-cholesterol");
		}
	});


	$("#blood-triglycerides-checkbox").on("change",function() {
		console.log("on change");
		if( $("#blood-triglycerides-checkbox").is(":checked") ) {
			console.log("showDiagram(blood-triglycerides)");
			app.showDiagram("blood-triglycerides","Blood Triglycerides");
		} else {
			console.log("hideDiagram(blood-triglycerides)");
			app.hideDiagram("blood-triglycerides");
		}
	});


	$("#blood-hdl-c-checkbox").on("change",function() {
		console.log("on change");
		if( $("#blood-small-hdl-c-checkbox").is(":checked") ) {
			console.log("showDiagram(blood-hdl-c)");
			app.showDiagram("blood-hdl-c","Blood HDL-C");
		} else {
			console.log("hideDiagram(blood-hdl-c)");
			app.hideDiagram("blood-hdl-c");
		}
	});


	$("#blood-ldl-c-checkbox").on("change",function() {
		console.log("on change");
		if( $("#blood-small-ldl-c-checkbox").is(":checked") ) {
			console.log("showDiagram(blood-ldl-c)");
			app.showDiagram("blood-ldl-c","Blood LDL-C");
		} else {
			console.log("hideDiagram(blood-ldl-c)");
			app.hideDiagram("blood-ldl-c");
		}
	});


	$("#blood-small-ldl-p-checkbox").on("change",function() {
		console.log("on change");
		if( $("#blood-small-ldl-p-checkbox").is(":checked") ) {
			console.log("showDiagram(blood-small-ldl-p)");
			app.showDiagram("blood-small-ldl-p","Blood Small LDL-P");
		} else {
			console.log("hideDiagram(blood-small-ldl-p)");
			app.hideDiagram("blood-small-ldl-p");
		}
	});


	$("#blood-ldl-p-checkbox").on("change",function() {
		console.log("on change");
		if( $("#blood-ldl-p-checkbox").is(":checked") ) {
			console.log("showDiagram(blood-ldl-p)");
			app.showDiagram("blood-ldl-p","Blood LDL-P");
		} else {
			console.log("hideDiagram(blood-ldl-p)");
			app.hideDiagram("blood-ldl-p");
		}
	});

	$("#body-fat-checkbox").on("change",function() {
		console.log("on change");
		if( $("#body-fat-checkbox").is(":checked") ) {
			console.log("showDiagram(body-fat)");
			app.showDiagram("body-fat","Body Fat");
		} else {
			console.log("hideDiagram(body-fat)");
			app.hideDiagram("body-fat");
		}
	});

	$("#body-weight-checkbox").on("change",function() {
		console.log("on change");
		if( $("#body-weight-checkbox").is(":checked") ) {
			console.log("showDiagram(body-weight)");
			app.showDiagram("body-weight","Body Weight");
		} else {
			console.log("hideDiagram(body-weight)");
			app.hideDiagram("body-weight");
		}
	});

	$("#body-calf-checkbox").on("change",function() {
		console.log("on change");
		if( $("#body-calf-checkbox").is(":checked") ) {
			console.log("showDiagram(body-calf)");
			app.showDiagram("body-calf","Body Calf");
		} else {
			console.log("hideDiagram(body-calf)");
			app.hideDiagram("body-calf");
		}
	});

	$("#body-thigh-checkbox").on("change",function() {
		console.log("on change");
		if( $("#body-thigh-checkbox").is(":checked") ) {
			console.log("showDiagram(body-thigh)");
			app.showDiagram("body-thigh","Body Thigh");
		} else {
			console.log("hideDiagram(body-thigh)");
			app.hideDiagram("body-thigh");
		}
	});

	$("#body-hips-checkbox").on("change",function() {
		console.log("on change");
		if( $("#body-hips-checkbox").is(":checked") ) {
			console.log("showDiagram(body-hips)");
			app.showDiagram("body-hips","Body Hips");
		} else {
			console.log("hideDiagram(body-hips)");
			app.hideDiagram("body-hips");
		}
	});

	$("#body-waist-checkbox").on("change",function() {
		console.log("on change");
		if( $("#body-waist-checkbox").is(":checked") ) {
			console.log("showDiagram(body-waist)");
			app.showDiagram("body-waist","Body Waist");
		} else {
			console.log("hideDiagram(body-waist)");
			app.hideDiagram("body-waist");
		}
	});


	$("#body-chest-checkbox").on("change",function() {
		console.log("on change");
		if( $("#body-chest-checkbox").is(":checked") ) {
			console.log("showDiagram(body-chest)");
			app.showDiagram("body-chest","Body Chest");
		} else {
			console.log("hideDiagram(body-chest)");
			app.hideDiagram("body-chest");
		}
	});


	$("#body-upper-arm-checkbox").on("change",function() {
		console.log("on change");
		if( $("#body-upper-arm-checkbox").is(":checked") ) {
			console.log("showDiagram(body-upper-arm)");
			app.showDiagram("body-upper-arm","Body Upper Arm");
		} else {
			console.log("hideDiagram(body-upper-arm)");
			app.hideDiagram("body-upper-arm");
		}
	});

	$("#body-neck-checkbox").on("change",function() {
		console.log("on change");
		if( $("#body-neck-checkbox").is(":checked") ) {
			console.log("showDiagram(body-neck)");
			app.showDiagram("body-neck","Body neck");
		} else {
			console.log("hideDiagram(body-neck)");
			app.hideDiagram("body-neck");
		}
	});


	$("#body-height-checkbox").on("change",function() {
		console.log("on change");
		if( $("#body-height-checkbox").is(":checked") ) {
			console.log("showDiagram(body-height)");
			app.showDiagram("body-height","Body Height");
		} else {
			console.log("hideDiagram(body-height)");
			app.hideDiagram("body-height");
		}
	});

	$("#exercise-fun-checkbox").on("change",function() {
		console.log("on change");
		if( $("#exercise-fun-checkbox").is(":checked") ) {
			console.log("showDiagram(exercise-fun)");
			app.showDiagram("exercise-fun","Exercise fun");
		} else {
			console.log("hideDiagram(exercise-fun)");
			app.hideDiagram("exercise-fun");
		}
	});


	$("#exercise-type-checkbox").on("change",function() {
		console.log("on change");
		if( $("#exercise-type-checkbox").is(":checked") ) {
			console.log("showDiagram(exercise-type)");
			app.showDiagram("exercise-type","Exercise type");
		} else {
			console.log("hideDiagram(exercise-type)");
			app.hideDiagram("exercise-type");
		}
	});

	$("#exercise-intensity-checkbox").on("change",function() {
		console.log("on change");
		if( $("#exercise-intensity-checkbox").is(":checked") ) {
			console.log("showDiagram(exercise-intensity)");
			app.showDiagram("exercise-intensity","Exercise Intensity");
		} else {
			console.log("hideDiagram(exercise-intensity)");
			app.hideDiagram("exercise-intensity");
		}
	});


	$("#exercise-calories-checkbox").on("change",function() {
		console.log("on change");
		if( $("#exercise-calories-checkbox").is(":checked") ) {
			console.log("showDiagram(exercise-calories)");
			app.showDiagram("exercise-calories","Exercise Calories");
		} else {
			console.log("hideDiagram(exercise-calories)");
			app.hideDiagram("exercise-calories");
		}
	});


	$("#exercise-length-checkbox").on("change",function() {
		console.log("on change");
		if( $("#exercise-length-checkbox").is(":checked") ) {
			console.log("showDiagram(exercise-length)");
			app.showDiagram("exercise-length","Exercise Length");
		} else {
			console.log("hideDiagram(exercise-length)");
			app.hideDiagram("exercise-length");
		}
	});

	$("#meal-alcohol-checkbox").on("change",function() {
		console.log("on change");
		if( $("#meal-alcohol-checkbox").is(":checked") ) {
			console.log("showDiagram(meal-alcohol)");
			app.showDiagram("meal-alcohol","Meal Alcohol");
		} else {
			console.log("hideDiagram(meal-alcohol)");
			app.hideDiagram("meal-alcohol");
		}
	});

	$("#meal-water-checkbox").on("change",function() {
		console.log("on change");
		if( $("#meal-water-checkbox").is(":checked") ) {
			console.log("showDiagram(meal-water)");
			app.showDiagram("meal-water","Meal Water");
		} else {
			console.log("hideDiagram(meal-water)");
			app.hideDiagram("meal-water");
		}
	});

	$("#meal-carb-checkbox").on("change",function() {
		console.log("on change");
		if( $("#meal-carb-checkbox").is(":checked") ) {
			console.log("showDiagram(meal-carb)");
			app.showDiagram("meal-carb","Meal Carb");
		} else {
			console.log("hideDiagram(meal-carb)");
			app.hideDiagram("meal-carb");
		}
	});

	$("#meal-protein-checkbox").on("change",function() {
		console.log("on change");
		if( $("#meal-protein-checkbox").is(":checked") ) {
			console.log("showDiagram(meal-protein)");
			app.showDiagram("meal-protein","Meal Protein");
		} else {
			console.log("hideDiagram(meal-protein)");
			app.hideDiagram("meal-protein");
		}
	});

	$("#meal-fat-checkbox").on("change",function() {
		console.log("on change");
		if( $("#meal-fat-checkbox").is(":checked") ) {
			console.log("showDiagram(meal-fat)");
			app.showDiagram("meal-fat","Meal Fat");
		} else {
			console.log("hideDiagram(meal-fat)");
			app.hideDiagram("meal-fat");
		}
	});

	$("#meal-keto-ratio-checkbox").on("change",function() {
		console.log("on change");
		if( $("#meal-keto-ratio-checkbox").is(":checked") ) {
			console.log("showDiagram(meal-keto-ratio)");
			app.showDiagram("meal-keto-ratio","Meal Keto Ratio");
		} else {
			console.log("hideDiagram(meal-keto-ratio)");
			app.hideDiagram("meal-keto-ratio");
		}
	});

	$("#ketonix-acetone-checkbox").on("change",function() {
		console.log("on change");
		if( $("#ketonix-acetone-checkbox").is(":checked") ) {
			console.log("showDiagram(ketonix-fat)");
			app.showDiagram("breath-acetone","Breath Ketones (PPM)");
		} else {
			console.log("hideDiagram(ketonix-acetone)");
			app.hideDiagram("breath-acetone");
		}
	});

	$("#ketonix-units-checkbox").on("change",function() {
		console.log("on change");
		if( $("#ketonix-units-checkbox").is(":checked") ) {
			console.log("showDiagram(units)");
			app.showDiagram("ketonix-units","Ketonix Units");
		} else {
			app.hideDiagram("ketonix-units");
			console.log("hideDiagram(units)");
		}
	});


	$( window ).on( "orientationchange", function( event ) {

		var vp = {
		    width  : $(window).width(),
		    height : $(window).height(),
		};

		var landscape = false;

		gaugePPM = new RadialGauge({
		    renderTo: 'gauge-ppm',
    		    width: (vp.width > vp.height ? vp.height : vp.width)*8/10,
    		    height: (vp.width > vp.height ? vp.height : vp.width)*8/10,
		    units: 'PPM',
		    title: false,
		    value: 0,
		    minValue: 0,
		    maxValue: 100,
		    majorTicks: [
			'0','10','20','30','40','50',
			'60','70','80','90','100'
		    ],
		    minorTicks: 2,
		    strokeTicks: false,
		    highlights: [
			{ from: 0, to: 4, color: 'rgba(0,0,200,.99)' },
			{ from: 4, to: 30, color: 'rgba(0,255,0,.70)' },
			{ from: 30, to: 80, color: 'rgba(255,255,0,.70)' },
			{ from: 80, to: 100, color: 'rgba(255,0,0,.70)' },
		    ],
		    colorPlate: '#222',
		    colorMajorTicks: '#f5f5f5',
		    colorMinorTicks: '#ddd',
		    colorTitle: '#fff',
		    colorUnits: '#ccc',
		    colorNumbers: '#eee',
		    colorNeedleStart: 'rgba(240, 128, 128, 1)',
		    colorNeedleEnd: 'rgba(255, 160, 122, .9)',
		    valueBox: true,
		    valueDec: 0,
		    animationRule: 'bounce'
		});
		gaugePPM.draw();
		if( event.orientation == 'landscape' ) {
			$("#logoImg").attr("width","30%");
			$("#gaugeDiv").css({ top: '-70px', position: 'relative' });
		} else {
			$("#logoImg").attr("width","80%");
			$("#gaugeDiv").css({ top: '50px', position: 'relative' });
		}
	});
    },
    checkVersion: function() {
	var current = $("#version").text();
	var latest = "";
	$.ajax({
	  url: "https://www.ketonix.com/latest.txt",
	  beforeSend: function( xhr ) {
	    xhr.overrideMimeType( "text/plain; charset=x-user-defined" );
	  }
	}).done(function( xhrdata ) {
		console.log("done");
		console.log("checkVersion() got xhrdata = ["+xhrdata+"]");
		latest = xhrdata.replace(/(?:\r\n|\r|\n)/g, '');
	    if ( console && console.log ) {
	      console.log( "https://www.ketonix.com/latest.txt = ", xhrdata );
	    }
	    if( current == latest) {
		$("#version").text("Version "+current+" (latest)");
		} else {
		$("#version").text("Upgrade? Current version is "+current+", the latest version is "+latest+"");
	     }
	  });

    },
    reloadDiagrams: function() {
	console.log("reloadDiagrams()");

	if( $("#ketonix-units-checkbox").is(":checked") ) {
		app.hideDiagram("ketonix-units");
		app.showDiagram("ketonix-units","Ketonix Units");
	}

	if( $("#ketonix-acetone-checkbox").is(":checked") ) {
		app.hideDiagram("breath-acetone");
		app.showDiagram("breath-acetone","Breath Ketones (PPM)");
	}

	if( $("#meal-fat-checkbox").is(":checked") ) {
		app.hideDiagram("meal-fat");
		app.showDiagram("meal-fat","Meal Fat");
	}

	if( $("#meal-protein-checkbox").is(":checked") ) {
		app.hideDiagram("meal-protein");
		app.showDiagram("meal-protein","Meal Protein");
	}

	if( $("#meal-carb-checkbox").is(":checked") ) {
		app.hideDiagram("meal-carb");
		app.showDiagram("meal-carb","Meal Carb");
	}

	if( $("#meal-water-checkbox").is(":checked") ) {
		app.hideDiagram("meal-water");
		app.showDiagram("meal-water","Meal Water");
	}

	if( $("#meal-alcohol-checkbox").is(":checked") ) {
		app.hideDiagram("meal-alcohol");
		app.showDiagram("meal-alcohol","Meal Alcohol");
	}

	if( $("#exercise-length-checkbox").is(":checked") ) {
		app.hideDiagram("exercise-length");
		app.showDiagram("exercise-length","Exercise Length");
	}

	if( $("#exercise-calories-checkbox").is(":checked") ) {
		app.hideDiagram("exercise-calories");
		app.showDiagram("exercise-calories","Exercise Calories");
	}

	if( $("#exercise-intensity-checkbox").is(":checked") ) {
		app.hideDiagram("exercise-intensity");
		app.showDiagram("exercise-intensity","Exercise Intensity");
	}

	if( $("#exercise-type-checkbox").is(":checked") ) {
		app.hideDiagram("exercise-type");
		app.showDiagram("exercise-type","Exercise type");
	}

	if( $("#exercise-fun-checkbox").is(":checked") ) {
		app.hideDiagram("exercise-fun");
		app.showDiagram("exercise-fun","Exercise fun");
	}

	if( $("#body-height-checkbox").is(":checked") ) {
		app.hideDiagram("body-height");
		app.showDiagram("body-height","Body Height");
	}

	if( $("#body-neck-checkbox").is(":checked") ) {
		app.hideDiagram("body-neck");
		app.showDiagram("body-neck","Body neck");
	}

	if( $("#body-upper-arm-checkbox").is(":checked") ) {
		app.hideDiagram("body-upper-arm");
		app.showDiagram("body-upper-arm","Body Upper Arm");
	}

	if( $("#body-chest-checkbox").is(":checked") ) {
		app.hideDiagram("body-chest");
		app.showDiagram("body-chest","Body Chest");
	}

	if( $("#body-waist-checkbox").is(":checked") ) {
		app.hideDiagram("body-waist");
		app.showDiagram("body-waist","Body Waist");
	}

	if( $("#body-hips-checkbox").is(":checked") ) {
		app.hideDiagram("body-hips");
		app.showDiagram("body-hips","Body Hips");
	}

	if( $("#body-thigh-checkbox").is(":checked") ) {
		app.hideDiagram("body-thigh");
		app.showDiagram("body-thigh","Body Thigh");
	}

	if( $("#body-calf-checkbox").is(":checked") ) {
		app.hideDiagram("body-calf");
		app.showDiagram("body-calf","Body Calf");
	}

	if( $("#body-weight-checkbox").is(":checked") ) {
		app.hideDiagram("body-weight");
		app.showDiagram("body-weight","Body Weight");
	}

	if( $("#body-fat-checkbox").is(":checked") ) {
		app.hideDiagram("body-fat");
		app.showDiagram("body-fat","Body Fat");
	}

	if( $("#blood-ldl-p-checkbox").is(":checked") ) {
		app.hideDiagram("blood-ldl-p");
		app.showDiagram("blood-ldl-p","Blood LDL-P");
	}

	if( $("#blood-small-ldl-p-checkbox").is(":checked") ) {
		app.hideDiagram("blood-small-ldl-p");
		app.showDiagram("blood-small-ldl-p","Blood Small LDL-P");
	}

	if( $("#blood-small-ldl-c-checkbox").is(":checked") ) {
		app.hideDiagram("blood-ldl-c");
		app.showDiagram("blood-ldl-c","Blood LDL-C");
	}

	if( $("#blood-small-hdl-c-checkbox").is(":checked") ) {
		app.hideDiagram("blood-hdl-c");
		app.showDiagram("blood-hdl-c","Blood HDL-C");
	}

	if( $("#blood-triglycerides-checkbox").is(":checked") ) {
		app.hideDiagram("blood-triglycerides");
		app.showDiagram("blood-triglycerides","Blood Triglycerides");
	}

	if( $("#blood-total-cholesterol-checkbox").is(":checked") ) {
		app.hideDiagram("blood-total-cholesterol");
		app.showDiagram("blood-total-cholesterol","Blood Total Cholesterol");
	}

	if( $("#blood-vldl-checkbox").is(":checked") ) {
		app.hideDiagram("blood-vldl");
		app.showDiagram("blood-vldl","Blood VLDL");
	}

	if( $("#blood-systolic-checkbox").is(":checked") ) {
		app.hideDiagram("blood-systolic");
		app.showDiagram("blood-systolic","Blood Systolic Pressure");
	}

	if( $("#blood-diastolic-checkbox").is(":checked") ) {
		app.hideDiagram("blood-diastolic");
		app.showDiagram("blood-diastolic","Blood Diastolic Pressure");
	}

	if( $("#blood-pulse-checkbox").is(":checked") ) {
		app.hideDiagram("blood-pulse");
		app.showDiagram("blood-pulse","Blood Pulse");
	}

	if( $("#blood-beta-hydroxybutyrate-checkbox").is(":checked") ) {
		app.hideDiagram("blood-beta-hydroxybutyrate");
		app.showDiagram("blood-beta-hydroxybutyrate","Blood Beta-HydroxyButyrate");
	}

	if( $("#blood-glucose-checkbox").is(":checked") ) {
		app.hideDiagram("blood-glucose");
		app.showDiagram("blood-glucose","Blood Glucose");
	}

    },
    askDeleteProfile: function() {
	var profile_name = $("#profile-name").val();
	if( confirm("Delete "+profile_name+"?") ) {
		 app.deleteProfile(1);
	}
    },
    deleteProfile: function(button) {
	if( button == 2 ) {
		$( "#set" ).children( ":last" ).collapsible( "collapse" );
		return;
	}
	var profile_name = $("#profile-name").val();
	if( profile_name == "" ) {
		console.log("empty profile-name");
		return;
	}
	var sql = "DELETE FROM profiles where name='"+profile_name+"'";
	console.log(sql);
	db.serialize( function() {
		db.run( sql ) ;
		$("#profile-name").val("");
		$("#profile-username").val("");
		$("#profile-password").val("");
		$("#profile-age").val("");
		$("#profile-usage").val("");
		$("#profile-autocomplete").val("");
		$('#profile-button').buttonMarkup({ icon: "alert" });
		$("#select-profile-anchor").text("Select a profile");
		$( "#set" ).children( ":last" ).collapsible( "collapse" );
		app.reloadProfiles();
	});
	alert(profile_name+" deleted!");
    },
    reloadProfiles: function() {
	try {
		var i=0;
		var html = "";
		var sql = "SELECT id,name from profiles";
		console.log("reloadProfiles("+sql+")");
		db.serialize( function() {
			allProfiles = null;
			allProfiles = new Array();
			console.log("db.each("+sql+")");
			db.each(sql,function(err,row) {
				console.log("reloadProfiles(): err="+err);
				console.log("reloadProfiles(): ["+(i++)+"] : "+ row.id + ", "+row.name);
				html += "<li id='"+row.id+"'><a href='#'>"+row.name + "</a></li>";
			}, function() {
				console.log("db.each("+sql+") finished");
				console.log("autocomplete-list.html("+html+")");
				$("#autocomplete-list").html(html);
				$("#autocomplete-list").listview('refresh');
				$( "#set" ).children( ":last" ).collapsible( "collapse" );
				$('<a href="#add-edit-profile" data-rel="close"></a>').click();
			});
		});
	} catch (exc) {
		console.log(exc);
	}
    },
    fillProfile: function(who) {
	try {
		var sql = "SELECT id,name,user,pass,gender,age,usage,smoker,donate FROM profiles where name='"+who+"'";
		console.log("fillProfile("+sql+")");
		db.serialize( function() {
			db.each(sql,function(err,row) {
				console.log("fillProfile: err="+err);
				$("#profile-id").val(row.id);
				$("#profile-name").val(row.name);
				$("#profile-username").val(row.user);
				$("#profile-age").val(row.age);
				// console.log("name = "+row.name);
				// console.log("user = "+row.user);
				var unencrypted = blowfish.decrypt(blowfish.base64Decode(row.pass));
				// console.log("password = "+results.rows.item(0).pass+" = "+unencrypted);
				$("#profile-password").val(unencrypted);
				// console.log("gender = "+results.rows.item(0).gender);
				// console.log("age = "+results.rows.item(0).age);
				// console.log("usage = "+results.rows.item(0).usage);
				// console.log("smoker = "+results.rows.item(0).smoker);
				// console.log("donate = "+results.rows.item(0).donate);
				if(row.gender == "male") {
					// console.log("gender should be checked and set to male");
					$("#profile-gender").prop("checked",true);
					$("#profile-gender").flipswitch("refresh");
				} else {
					// console.log("gender should be unchecked and set to female");
					$("#profile-gender").prop("checked",false);
					$("#profile-gender").flipswitch("refresh");
				}
				if(row.smoker == "yes"){
					// console.log("smoker should be checked");
					$("#profile-smoker").prop('checked','true');
					$("#profile-smoker").checkboxradio("refresh");
				} else {
					// console.log("smoker should be unchecked");
					$("#profile-smoker").prop('checked', false);
					$("#profile-smoker").checkboxradio("refresh");
				}
				if(row.donate == "yes"){
					// console.log("donate should be checked");
					$("#profile-donate").prop('checked',true);
					$("#profile-donate").checkboxradio("refresh");
				} else {
					// console.log("donate should be unchecked");
					$("#profile-donate").prop('checked',false);
					$("#profile-donate").checkboxradio("refresh");
				}
				$("#profile-usage").val("");
				$("#profile-usage option[value='"+row.usage+"']").attr("selected",true);
				$("#profile-usage").selectmenu("refresh",true);
				// console.log("filling details from user :"+who);
			});
		});
	} catch (exc) {
		console.log(exc);
	}
    },
    updateProfile: function() {
	var profile_id = $("#profile-id").val();
	var profile_name = $("#profile-name").val();
	var profile_username = $("#profile-username").val();
	var profile_password = $("#profile-password").val();
	var profile_age = $("#profile-age").val();
	var profile_smoker = $("#profile-smoker").is(':checked') ? "yes" : "no";
	var profile_gender = $("#profile-gender").is(':checked') ? "male" : "female";
	var profile_donate = $("#profile-donate").is(':checked') ? "yes" : "no";
	var profile_usage = $("#profile-usage").val();

	console.log("updating profile with id "+profile_id);

	console.log("password = "+profile_password);

        var encrypted_password = blowfish.base64Encode(blowfish.encrypt(profile_password));


	var sql = "UPDATE profiles SET name='"+profile_name+"',user='"+profile_username+"',pass='"+encrypted_password+"',gender='"+profile_gender+"',age='"+profile_age+"',usage='"+profile_usage+"',smoker='"+profile_smoker+"',donate='"+profile_donate+"' WHERE id='"+profile_id+"'";
	console.log(sql);
	db.serialize(function() {
		db.run(sql,[], function() {
			app.reloadProfiles();
			$("#profile-autocomplete").val(profile_name);
			$( "#set" ).children( ":last" ).collapsible( "collapse" );
		});
	});
    },
    saveNewProfile: function() {
	var profile_name = $("#profile-name").val();
	var profile_username = $("#profile-username").val();
	var profile_password = $("#profile-password").val();
	var profile_age = $("#profile-age").val();
	if( profile_age == "" ) profile_age = "25";
	var profile_smoker = $("#profile-smoker").is(':checked') ? "yes" : "no";
	var profile_gender = $("#profile-gender").is(':checked') ? "male" : "female";
	var profile_donate = $("#profile-donate").is(':checked') ? "yes" : "no";
	var profile_usage = $("#profile-usage").val();
        var encrypted_password = blowfish.base64Encode(blowfish.encrypt(profile_password));

	// Check if profile-name exists, then ERROR else create a new profile
	var sql = "SELECT name from profiles where name='"+profile_name+"'";
	var user_exist = false;
	console.log("DEBUG-0");
	db.serialize( function() {
		var i=0;
		console.log("DEBUG-1");
		console.log(sql);
		db.each(sql,[],function(err,row) {
			console.log("DEBUG-2: err="+err);
			console.log("USER "+profile_name+" ALREADY EXIST!");
			user_exist = true;
		}, function() {
			// No error, lets investigate if user existed
			console.log("DEBUG-3");
			console.log( user_exist ? "User existed already" : "User did not exist");
			var ix = 1;
			var new_profile_name = profile_name+" #"+ix;
			if( user_exist ) {
				console.log("DEBUG-4");
				alert('Error: A profile with name '+profile_name+' already exists!');
				return;
			} else {
				sql = "INSERT INTO profiles (name,user,pass,gender,age,usage,smoker,donate) VALUES ('"+profile_name+"','"+profile_username+"','"+encrypted_password+"','"+profile_gender+"',"+profile_age+",'"+profile_usage+"','"+profile_smoker+"','"+profile_donate+"')";

				console.log(sql);
				db.serialize(function() {
					console.log("DEBUG-7");
					db.run(sql,[], function() {
						console.log("DEBUG-9");
						// console.log("Success:"+sql);
						app.reloadProfiles();
						$("#profile-autocomplete").val(profile_name);
						$( "#set" ).children( ":last" ).collapsible( "collapse" );
					});
				});
				console.log("DEBUG-5");
			}
		});
	});

	console.log("DEBUG-6");
    },
    updateGaugeSettings: function() {
		console.log("updateGaugeSettings()");
		device.write([0x00,0x37]);
		device.read(function updateIt(err,data) {
			if( data == undefined ) { 
				$("#status-message").text("Device disconnected");
				$(":mobile-pagecontainer").pagecontainer("change","#home");
				$("#range-zoom-div").hide();
				lookForUsbDevice = true;
				if( bluetoothIsOn == true && noble != null) noble.startScanning(["092cb9a14cbe475e9f56d29404dd29f1"]);
				setTimeout(app.lookForDevice,3000);
			}
			deviceType = (data[15] + (data[16] << 8));
			theDeviceId = (data[17] + (data[18] << 8));
			var green = (data[7] + (data[8] << 8))/10;
			var yellow = (data[9] + (data[10] << 8))/10;
			var red = (data[11] + (data[12] << 8))/10;
			console.log("got id="+theDeviceId+", green="+green+", yellow="+yellow+", red="+red);

			if( deviceType == 2 ) {
				// var g = Math.log(0.1385*green*10)/0.0077;
				// var y = Math.log(0.1385*yellow*10)/0.0077;
				// var r = Math.log(0.1385*red*10)/0.0077;
				var g = 0.1385*Math.exp(0.0077*green*10);
				var y = 0.1385*Math.exp(0.0077*yellow*10);
				var r = 0.1385*Math.exp(0.0077*red*10);
				green = g;
				yellow = y;
				red = r;
			} 
			if( deviceType == 4 ) {
				// var g = Math.log(0.1385*green*10)/0.0077;
				// var y = Math.log(0.1385*yellow*10)/0.0077;
				// var r = Math.log(0.1385*red*10)/0.0077;
				var g = 0.3453*Math.exp(0.0079*green*10);
				var y = 0.3453*Math.exp(0.0079*yellow*10);
				var r = 0.3453*Math.exp(0.0079*red*10);
				green = g;
				yellow = y;
				red = r;
			} 
			saved_green = green;
			saved_yellow = yellow;
			saved_red = red;
			if( deviceType < 2 ) {
	                              	gaugePPM = createRadialGauge('Units',green,yellow,red);
	                               	console.log("2>>>>>>>>>>>>>>>> gaugePPM = createRadialGauge('Units',"+green+","+yellow+","+red+")");
	                              	gaugePPM.draw();
			} else {
	                              	gaugePPM = createRadialGauge('PPM',green,yellow,red);
	                              	// console.log("3) gaugePPM = createRadialGauge('PPM',"+green+","+yellow+","+red+")");
	                               	console.log("2>>>>>>>>>>>>>>>> gaugePPM = createRadialGauge('PPM',"+green+","+yellow+","+red+")");
	                              	gaugePPM.draw();
			}
		});

    },
    bindEvents: function() {

	console.log("bindEvents");

        document.addEventListener('deviceready', this.onDeviceReady, false);
        // refreshButton.addEventListener('touchstart', this.refreshDeviceList, false);
        // deviceList.addEventListener('touchstart', this.connect, false);

	$('#save-measure-button').addClass('ui-state-disabled');

	$('#import-csv-file').change( function(e) {
		try {
			var fileName = e.target.files[0].name;
			console.log("fileName="+fileName);
		} catch (err)  {}
	});

	$('#import-csv-data-button').click( function() {
            	var fileName = $("#import-csv-file").val();
		app.importCSV(fileName);
	});
	
	$('#info-button-home').click( function() {
  		window.open('http://www.ketonix.com/images/PDF/Manual-Native-Home-2.4.pdf', 'Help', '');

	});
	$('#info-button-measure').click( function() {
  		window.open('http://www.ketonix.com/images/PDF/Manual-Native-Measure-2.4.pdf', 'Help', '');
	});
	$('#info-button-analyze').click( function() {
  		window.open('http://www.ketonix.com/images/PDF/Manual-Native-Analyze-2.4.pdf', 'Help', '');
	});

	$("#refresh-diagrams-button").click( function() {
		app.reloadDiagrams();
	});

	$('#settings-button').addClass('ui-state-disabled');

	
	$("#autocomplete-list").on("click", "li", function () {
		console.log("autocomplete.click()");

		// Get the profile name from the list item
        	var text = $("a", this).text();

		// Save the profile id in a variable
        	currentProfileId = this.id;

		// Save it so we dont have to choose it every time
		app.setLastUsedProfile(currentProfileId);

		console.log("autocomplete.click() id = "+currentProfileId+", name = "+text);

		// Update the field with the profile name
        	$("#profile-autocomplete").val(text);

		// Save the profile name in a variable
		currentProfile=text;

		// Close selection
        	$(this).siblings().addBack().addClass("ui-screen-hidden");

		// Fill profile details
		app.fillProfile(text);

		// Close the profile panel
        	$("#profile-panel").panel("close");

		// Update the profile anchor
		$("#select-profile-anchor").text(text);
		$("#select-profile-anchor").html(text);
		$("#select-profile-anchor").trigger("refresh");

		// log it to the console
		console.log("updated select-profile-anchor with text " + text);
    	});


	console.log("setting up data-panel");
	$( "#data-panel" ).panel({
  		beforeopen: function( event, ui ) {
			console.log("panelbeforeopen");
			var dts = $("#data-timestamp").val();
			if( dts == "1964-07-02 07:00") {
				console.log("enable reset demo button");
				$("#reset-demo-data-button").show();
			} else {
				$("#reset-demo-data-button").hide();
			}
		}
	});

	$( "#settings-panel" ).panel({
  		beforeopen: function( event, ui ) {
			console.log("settings-panel-beforeopen");
			device.write([0x00,0x37]);
			device.read(function updateIt(err,data) {
				if( data == undefined ) { 
					$("#status-message").text("Device disconnected");
					$(":mobile-pagecontainer").pagecontainer("change","#home");
					$("#range-zoom-div").hide();
					lookForUsbDevice = true;
					if( bluetoothIsOn && noble != null) noble.startScanning(["092cb9a14cbe475e9f56d29404dd29f1"]);
					setTimeout(app.lookForDevice,3000);
				}
				deviceType = (data[15] + (data[16] << 8));
				var green = (data[7] + (data[8] << 8))/10;
				var yellow = (data[9] + (data[10] << 8))/10;
				var red = (data[11] + (data[12] << 8))/10;
				console.log("got green="+green+", yellow="+yellow+", red="+red);
				if( deviceType < 2 ) {
				       // gaugePPM = createRadialGauge('Units',green,yellow,red);
				} else if(deviceType == 2) {
					var g = 0.1385*Math.exp(0.0077*green*10);
					var y = 0.1385*Math.exp(0.0077*yellow*10);
					var r = 0.1385*Math.exp(0.0077*red*10);
					console.log("green("+(green*10)+")=>g("+g+")");
					console.log("yellow("+(yellow*10)+")=>y("+y+")");
					console.log("red("+(red*10)+")=>r("+r+")");
					// gaugePPM = createRadialGauge('PPM',g,y,r);
					green = g;
					yellow = y;
					red = r;
				} else if( deviceType == 4 ) {
					var g = 0.3453*Math.exp(0.0079*green*10);
					var y = 0.3453*Math.exp(0.0079*yellow*10);
					var r = 0.3453*Math.exp(0.0079*red*10);
					console.log("green("+(green*10)+")=>g("+g+")");
					console.log("yellow("+(yellow*10)+")=>y("+y+")");
					console.log("red("+(red*10)+")=>r("+r+")");
					green = g;
					yellow = y;
					red = r;
				}
				
				$("#green-range-setting").mobiscroll("setVal",[green,yellow,red]);
			});
		}
	});
	
	/*
        disconnectButton.addEventListener('touchstart', this.disconnect, false);
	*/

	$("#range-zoom").flipswitch().prop("checked",false).flipswitch("refresh");

	$("#range-zoom").change( function() {
		console.log("#range-zoom.change(start)");
		if( ignoreZoom == true ) return;
		if($("#range-zoom").prop("checked")) {
			console.log("zoom in");
			zoomOn = true;
			gaugePPM = recreateRadialGauge()
			gaugePPM.draw();
			app.setLastUsedZoom(zoomOn);
		} else {
			zoomOn = false;
			console.log("zoom out");
			gaugePPM = recreateRadialGauge()
			gaugePPM.draw();
			app.setLastUsedZoom(zoomOn);
		}
		console.log("#range-zoom.change(end)");
	});

	$("#range-zoom-div").hide();

	$("#green-range-setting").change( function() {
		var val = $("#green-range-setting").mobiscroll("getVal");
		var gval = val[0]; var yval = val[1]; var rval = val[2];
		if( gval > yval ) { yval = gval; }
		if( gval > rval ) { rval = gval; }
		val[0] = gval; val[1] = yval; val[2] = rval;
		$("#green-range-setting").mobiscroll("setVal",val);
	});

	$("#yellow-range-setting").change( function(event,inst) {
		var val = $("#green-range-setting").mobiscroll("getVal");
		var gval = val[0]; var yval = val[1]; var rval = val[2];
		if( yval < gval ) { gval = yval; }
		if( yval > rval ) { rval = yval; }
		val[0] = gval; val[1] = yval; val[2] = rval;
		$("#green-range-setting").mobiscroll("setVal",val);
	});

	$("#red-range-setting").change( function(event,inst) {
		var val = $("#green-range-setting").mobiscroll("getVal");
		var gval = val[0]; var yval = val[1]; var rval = val[2];
		if( rval < yval ) { yval = rval; }
		if( rval < gval ) { gval = rval; }
		val[0] = gval; val[1] = yval; val[2] = rval;
		$("#green-range-setting").mobiscroll("setVal",val);
	});



	$("#apply-settings-button").click( function() {
		var val = $("#green-range-setting").mobiscroll("getVal");
		var gval = val[0]; var yval = val[1]; var rval = val[2];
		app.applySettings(gval*10,yval*10,rval*10);
	});

	$("#calibration-button").click( function() {
		app.calibrateDevice();
	});


	$("#blue-factory-button").click( function() {
		app.setBlueFactorySettings();
	});
	$("#usb-factory-button").click( function() {
		app.setUsbFactorySettings();
	});
	$("#red-factory-button").click( function() {
		app.setRedFactorySettings();
	});


	$("#update-profile-button").click( function() {
		app.updateProfile();
	});

	$("#save-new-profile-button").click( function() {
		app.saveNewProfile();
	});
	$("#delete-profile-button").click( function() {
		app.askDeleteProfile();
	});

	$(".delete-data-point").on("click", function() { alert("delete-data-point"); } );

	$( "#save-measure-button" ).click( function() {

		if( deviceType >= 2 ) {
			app.saveData("breath-acetone",maxValue);
		} else {
			app.saveData("ketonix-units",maxValue);
		}
		console.log("SETTING CONTINOUS MODE");
		if(lookForUsbDevice) device.write([0x00,0x43]); // CONTINOUS MODE
		afterSave = true;
	});

	$("#edit-data-points-page").on("pageshow",function(event){
		console.log("edit-data-points-page.pageshow()");
		app.showDataPoints();
	});
	$("#edit-data-points-page").on("pagehide",function(event){
		console.log("edit-data-points-page.pagehide()");
		app.reloadDiagrams();
	});

    },
    youMustDisconnectAndConnect: function() {
	$("#settings-panel").panel("close");
	alert("Now disconnect and connect your device again");
    },
    applySettings: function(gval_in,yval_in,rval_in) {
	console.log("applySettings("+gval_in+","+yval_in+","+rval_in+")");
	var gval = gval_in;
	var yval = yval_in;
	var rval = rval_in;
	// If device >= 2 then it's PPM
	// else it's raw values
	// ppm = 0.1385*e(0.0077*raw) ... raw = 300 => ppm = 1.3953
	// raw = Math.ln(ppm/0.1385)/0.0077
	if( deviceType > 10) deviceType = 2;
	if( deviceType >= 2 ) {
		gval = Math.round(Math.log((gval_in/10)/0.1385)/0.0077);
		yval = Math.round(Math.log((yval_in/10)/0.1385)/0.0077);
		rval = Math.round(Math.log((rval_in/10)/0.1385)/0.0077);
		console.log("applySettings("+(gval_in/10)+","+(yval_in/10)+","+(rval_in/10)+")->("+gval+","+yval+","+rval+")");
	}
	device.write([0x00,0x37]);
	device.read(function updateIt(err,data) {
		if( data == undefined ) { 
			$("#status-message").text("Device disconnected");
			$(":mobile-pagecontainer").pagecontainer("change","#home");
			$("#range-zoom-div").hide();
			lookForUsbDevice = true;
			if( bluetoothIsOn && noble != null) noble.startScanning(["092cb9a14cbe475e9f56d29404dd29f1"]);
			setTimeout(app.lookForDevice,3000);
		}

		setTimeout(app.youMustDisconnectAndConnect,1000);

		var tmpDeviceType = (data[15] + (data[16] << 8));
		console.log("tmpDeviceType="+tmpDeviceType+", deviceType="+deviceType);
		var green = (data[7] + (data[8] << 8));
		var yellow = (data[9] + (data[10] << 8));
		var red = (data[11] + (data[12] << 8));
		console.log("got green="+green+", yellow="+yellow+", red="+red);
		// Change
		data[7] = (gval >> 0); data[8] = (gval >> 8);
		data[9] = (yval >> 0); data[10] = (yval >> 8);
		data[11] = (rval >> 0); data[12] = (rval >> 8);
		var data2 = Array();
		var x=0;
        	for(x=0; x < 64-1; x++) data2[x+1] = data[x];
		data2[0] = 0x0;
		data2[1] = 0x36;
		data2[16] = (deviceType >> 0);
		data2[17] = (deviceType >> 8);
		device.write(data2);
	});
    },
    writeCalibrationFinished: function() {
	// $.mobile.loading( "hide");
	$.unblockUI();
    },
    saveCalibration: function(val) { // CALIBRATION
	try {
		db.serialize( function() {
			var sql = "DELETE FROM prefs WHERE name='calibration'";
			console.log(sql);
			db.run(sql);
			sql = "INSERT INTO prefs (name,value) VALUES ('calibration','"+val+"')";
			console.log(sql);
			db.run(sql);
		});
	} catch (err) {
		console.log("setLastUsedProfile:"+err);
	}
    },
    writeCalibration: function(val) { // CALIBRATION
	console.log("writeCalibration("+val+" is zero)");
	// below val+0.3 PPM? should be zero
	// Save soft calibration

	app.saveCalibration(val);

	device.write([0x00,0x37]);
	device.read(function updateIt(err,data) {
		if( data == undefined ) { 
			$("#status-message").text("Device disconnected");
			$(":mobile-pagecontainer").pagecontainer("change","#home");
			$("#range-zoom-div").hide();
			lookForUsbDevice = true;
			if( bluetoothIsOn && noble != null) noble.startScanning(["092cb9a14cbe475e9f56d29404dd29f1"]);
			setTimeout(app.lookForDevice,3000);
			return;
		}

		setTimeout(app.youMustDisconnectAndConnect,3000);

		console.log("writing new calibration now");
		var old_deviceType = (data[15] + (data[16] << 8));
		console.log("got old_deviceType = "+old_deviceType);
		if( old_deviceType > 10 ) { deviceType = 2;} else { deviceType = old_deviceType; }
		var old_cal = (data[13] + (data[14] << 8));
		console.log("got old cal="+old_cal+", setting new cal to "+val);
		// Change
		if( deviceType == 2) {
			data[13] = (100 >> 0); data[14] = (100 >> 8);
			console.log("new calibration (type="+deviceType+") = 100");
		} else {
			data[13] = (val >> 0); data[14] = (val >> 8);
			console.log("new calibration (type="+deviceType+") = "+val);
		}
		var data2 = Array();
		var x=0;
        	for(x=0; x < 64-1; x++) data2[x+1] = data[x];
		data2[0] = 0x0;
		data2[1] = 0x36;
		data[16] = (deviceType >> 0); data[17] = (deviceType >> 8);
		device.write(data2);
		console.log("writing new calibration (type="+deviceType+") finished");
	});
	setTimeout(app.writeCalibrationFinished,100);
    },
    checkCalibration: function() {
	console.log("************ checkCalibration()");
	cal_time++;
	device.write([0x00,0x37]);
	device.read(function updateIt(err,data) {
		if( data == undefined ) { 
			$("#status-message").text("Device disconnected");
			$(":mobile-pagecontainer").pagecontainer("change","#home");
			$("#range-zoom-div").hide();
			lookForUsbDevice = true;
			if( bluetoothIsOn && noble != null) noble.startScanning(["092cb9a14cbe475e9f56d29404dd29f1"]);
			setTimeout(app.lookForDevice,3000);
		}
		// deviceType = (data[15] + (data[16] << 8));
		var raw = (data[3] + (data[4] << 8));
		var warm = (data[5] + (data[6] << 8));
		if( warm < 100 ) { 
			console.log("not yet warm ("+warm+")");  
			setTimeout(app.checkCalibration,20000);
			return;
		}
		console.log("********** raw = "+raw+", cal_prev_raw = "+cal_prev_raw);
		if(deviceType == 2) {
			console.log("checkCalibration() deviceType == 2, writing calibration");
			app.writeCalibration(raw);
			return;
		}
		if( (cal_prev_raw-1) <= raw  && (cal_prev_raw+1) >= raw ) {
			app.writeCalibration(raw);
		} else {
			console.log("************** checking again in a sec");
			cal_prev_raw = raw;
			setTimeout(app.checkCalibration,20000);
		}
	});
    },
    startCalibration: function() {
	console.log("startCalibration()");
	$("#settings-panel").panel("close");
	$.blockUI( { message: "Calibrating device ..." });
	cal_prev_raw = 0; cal_time = 0;
	/*
	$.mobile.loading( "show", {
	            text: "Calibrating device",
	            textVisible: true,
	            theme: "b",
	            textonly: false,
	            html: ""
	});
	*/
	setTimeout(app.checkCalibration,10000);
    },
    calibrateDevice: function() {
	console.log("calibrate");
	setTimeout(app.startCalibration,100);
    },
    setRedFactorySettings: function() {
	console.log("setRedFactorySettings");
	var val = $("#green-range-setting").mobiscroll("getVal");
	val[0] = 25; val[1] = 50; val[2] = 75;
	$("#green-range-setting").mobiscroll("setVal",val);
    },
    setBlueFactorySettings: function() {
	console.log("setBlueFactorySettings");
	var val = $("#green-range-setting").mobiscroll("getVal");
	val[0] = 25; val[1] = 40; val[2] = 60;
	$("#green-range-setting").mobiscroll("setVal",val);
    },
    setUsbFactorySettings: function() {
	console.log("setUsbFactorySettings");
	var val = $("#green-range-setting").mobiscroll("getVal");
	val[0] = 4; val[1] = 30; val[2] = 80;
	$("#green-range-setting").mobiscroll("setVal",val);
    },
    saveInCloud: function(profile_user,profile_pass,profile_gender,profile_age,profile_usage,profile_smoker,profile_donate,timestamp,data_type,value){

    	console.log("saveInCloud("+profile_user+":"+profile_pass+":"+profile_gender+":"+profile_age+":"+profile_usage+":"+profile_smoker+":"+profile_donate+":"+timestamp+":"+data_type+":"+value+")");
	var v_username = profile_user;
	var v_pass = blowfish.decrypt(blowfish.base64Decode(profile_pass));
	console.log("v_pass=["+v_pass+"]");
	var v_smoking = profile_smoker == "yes" ? "1" : "0";
	var v_gender = profile_gender == "male" ? "1" : "0";
	var v_public = profile_donate == "yes" ? "1" : "0";
	var v_age = profile_age;
	var v_usage = 0; 
	if( profile_usage == "weight Loss" ) v_usage = 0;
	if( profile_usage == "sport" ) v_usage =  1 ;
	if( profile_usage == "diabetes" ) v_usage =  2 ;
	if( profile_usage == "epilepsy" ) v_usage =  3 ;
	if( profile_usage == "cancer" ) v_usage =  4 ;
	if( profile_usage == "alzheimer" ) v_usage =  5 ;
	if( profile_usage == "parkinson" ) v_usage =  6 ;
	if( profile_usage == "adhd" ) v_usage =  7 ;
	if( profile_usage == "fertility" ) v_usage =  8 ;
	if( profile_usage == "other" ) v_usage =  9 ;
	var v_label = "";

	// KETONIX STUFF
	if( data_type == "breath-acetone" ) v_label = "KetonixPPM";
	if( data_type == "ketonix-units" ) v_label = "Ketonix";

	// MEAL STUFF
	if( data_type == "meal-fat" ) v_label = "Fat";
	if( data_type == "meal-protein" ) v_label = "Protein";
	if( data_type == "meal-carb" ) v_label = "Carbohydrates";
	if( data_type == "meal-water" ) v_label = "Water";
	if( data_type == "meal-alcohol" ) v_label = "AlcoholUnits";
	if( data_type == "meal-keto-ratio" ) v_label = "KetogenicRatio";
        // caloriesAmount = fatAmount*9 + proteinAmount*4 + carbAmount*4;
	if( data_type == "meal-calories" ) v_label = "CaloriesIn";


	// EXERCISE STUFF
	if( data_type == "exercise-length" ) v_label = "ExerciseLength";
	if( data_type == "exercise-calories" ) v_label = "CaloriesOut";
	if( data_type == "exercise-intensity" ) v_label = "ExerciseIntensity";
	if( data_type == "exercise-type" ) v_label = "ExerciseType";
	if( data_type == "exercise-fun" ) v_label = "ExerciseFun";

	// BODY MEASURES STUFF
	if( data_type == "body-height" ) v_label = "Height";
	if( data_type == "body-neck" ) v_label = "Neck";
	if( data_type == "body-upper-arm" ) v_label = "UpperArm";
	if( data_type == "body-chest" ) v_label = "Chest";
	if( data_type == "body-waist" ) v_label = "Waist";
	if( data_type == "body-hips" ) v_label = "Hips";
	if( data_type == "body-thigh" ) v_label = "Thigh";
	if( data_type == "body-calf" ) v_label = "Calf";
	if( data_type == "body-weight" ) v_label = "Weight";
	if( data_type == "body-fat" ) v_label = "BodyFat";

	// BLOOD STUFF
	if( data_type == "blood-ldl-p" ) v_label = "LDLP";
	if( data_type == "blood-small-ldl-p" ) v_label = "SmallLDL";
	if( data_type == "blood-ldl-c" ) v_label = "LDLC";
	if( data_type == "blood-hdl-c" ) v_label = "HDLC";
	if( data_type == "blood-triglycerides" ) v_label = "Triglycerides";
	if( data_type == "blood-total-cholesterol" ) v_label = "Cholesterol";
	if( data_type == "blood-vldl" ) v_label = "VLDL";
	if( data_type == "blood-systolic" ) v_label = "Systolic";
	if( data_type == "blood-diastolic" ) v_label = "Diastolic";
	if( data_type == "blood-pulse" ) v_label = "Pulse";
	if( data_type == "blood-beta-hydroxybutyrate" ) v_label = "BHOB";
	if( data_type == "blood-glucose" ) v_label = "Glucose";

	var v_date = timestamp.substring(0,10);
	var v_time_tmp = timestamp.substring(11,16)+":00";
	console.log("v_time_tmp="+v_time_tmp);
	var v_time = v_time_tmp.replace(/:/g,"-");
	console.log("v_time="+v_time);

	console.log("v_date = ["+v_date+"]");
	console.log("v_time = ["+v_time+"]");

	//https://www.ketonix.com/index.php?option=com_api&app=ketonix&resource=store&username=michel&password=WebM00se&smoking=0&gender=1&age=52&usage=3&date=2017-02-15&time=08-37-15&calibration=0&value=1&integration=Ketonix&label=Neck&key=84b5c80b96f2674f1de14e2ed5fcdc99&format=raw&public=0
	// $.get("https://www.ketonix.com/index.php", {
	$.ajax( {
		type: "GET",
		url: "https://www.ketonix.com/index.php",
		success: function(xhr,status,error) {
			console.log("onCloudSaveSuccess: status="+status+", error="+error);
    		},
		error: function(xhr,status,error) {
			console.log("onCloudSaveError: status="+status+", error="+error);
    		},
		data: {
			option: "com_api",
			app: "ketonix",
			resource: "store",
			username: v_username,
			password: v_pass,
			smoking: v_smoking,
			gender: v_gender,
			age: v_age,
			usage: v_usage,
			date: v_date,
			time: v_time,
			calibration: "100",
			value: value,
			integration: "Ketonix",
			label: v_label,
			key: "84b5c80b96f2674f1de14e2ed5fcdc99",
			format: "raw",
			public: v_public
		},
		async: false
	}, function(data) {
		// console.log("cloud save "+data);
		console.log("cloud save of "+data_type+" = "+value+" :"+data);
	});
    },
    saveData: function(data_type,value) {
	var timestamp = new Date().format("%Y-%m-%d %H:%M:%S");
	var savedValue = value.toFixed(1); // Math.round(value);
	console.log("savedValue="+savedValue);
	app.saveDataTime(timestamp,data_type,savedValue);
    },
    saveDataTime: function(timestamp, data_type,value) {

		var sql = "";
		var profile_id = 0;
		var profile_user = "";
		var profile_pass = "";
		var profile_gender = "";
		var profile_age = 0;
		var profile_usage = "";
		var profile_smoker = "";
		var profile_donate = "";

		console.log("saveDataTime("+timestamp+","+data_type+","+value+")");


		if(currentProfile == "") {
			$("#status-message").text("No profile, can't save ..");
			return;
		}

		db.serialize( function() {
			sql = "SELECT id,user,pass,gender,age,usage,smoker,donate FROM profiles WHERE name='"+currentProfile+"'";
			db.each(sql,[],function(err,row) {
				profile_id = row.id;
				profile_user = row.user;
				profile_pass = row.pass;
				profile_gender = row.gender;
				profile_age = row.age;
				profile_usage = row.usage;
				profile_smoker = row.smoker;
				profile_donate = row.donate;
				console.log("saving measure to "+currentProfile+"(id:"+profile_id+")");
			}, function() {
				sql = "INSERT INTO data (profile_id,timestamp,data_type, value) VALUES ("+profile_id+",'"+timestamp+"','"+data_type+"',"+value+")";

				console.log(sql);
				console.log("starting saveDataTime() transaction");
				db.run(sql,[],function() {
					console.log("saveDataTime() transaction finished");
					app.saveInCloud(profile_user,profile_pass,profile_gender,profile_age,profile_usage,profile_smoker,profile_donate,timestamp,data_type,value);
				});
			});
		});
    },
    debug: function(str) {
	console.log("Debug: "+str);
    },
    resetDemoData: function() {
	db.serialize( function() {
	  var demopassword = blowfish.base64Encode(blowfish.encrypt("demo_password"));
	  db.run("DELETE FROM profiles");
	  db.run("DELETE FROM data");
	  db.run("DELETE FROM prefs");
          db.run("INSERT INTO profiles (id,name,user,pass,gender,age,usage,smoker,donate) VALUES (0,'Jeff Taylor','demo_jeff','"+demopassword+"','male',55,'Diabetes','no','yes')");
          db.run("INSERT INTO profiles (id,name,user,pass,gender,age,usage,smoker,donate) VALUES (1,'Rod Eenfeldt','demo_rod','"+demopassword+"','male',45,'Sport','no','yes')");
          db.run("INSERT INTO profiles (id,name,user,pass,gender,age,usage,smoker,donate) VALUES (2,'Jimmy Gerber','demo_jimmy','"+demopassword+"','male',49,'Diabetes','no','yes')");
          db.run("INSERT INTO profiles (id,name,user,pass,gender,age,usage,smoker,donate) VALUES (3,'Andreas Fung','demo_andreas','"+demopassword+"','male',47,'Diabetes','no','yes')");

	  db.run("INSERT INTO data (profile_id,timestamp,data_type,value) VALUES (0,'2017-02-18 06:00:00','breath-acetone','5')");
          db.run("INSERT INTO data (profile_id,timestamp,data_type,value) VALUES (0,'2017-02-18 12:00:00','breath-acetone','6')");
          db.run("INSERT INTO data (profile_id,timestamp,data_type,value) VALUES (0,'2017-02-19 06:00:00','breath-acetone','6')");
          db.run("INSERT INTO data (profile_id,timestamp,data_type,value) VALUES (0,'2017-02-19 12:00:00','breath-acetone','7')");
          db.run("INSERT INTO data (profile_id,timestamp,data_type,value) VALUES (0,'2017-02-20 06:00:00','breath-acetone','7')");
          db.run("INSERT INTO data (profile_id,timestamp,data_type,value) VALUES (0,'2017-02-20 12:00:00','breath-acetone','7')");
          db.run("INSERT INTO data (profile_id,timestamp,data_type,value) VALUES (0,'2017-02-21 06:00:00','breath-acetone','7')");
          db.run("INSERT INTO data (profile_id,timestamp,data_type,value) VALUES (0,'2017-02-21 12:00:00','breath-acetone','6')");
          db.run("INSERT INTO data (profile_id,timestamp,data_type,value) VALUES (0,'2017-02-22 06:00:00','breath-acetone','7')");
          db.run("INSERT INTO data (profile_id,timestamp,data_type,value) VALUES (0,'2017-02-22 12:00:00','breath-acetone','7')");
          db.run("INSERT INTO data (profile_id,timestamp,data_type,value) VALUES (0,'2017-02-23 06:00:00','breath-acetone','10')");
          db.run("INSERT INTO data (profile_id,timestamp,data_type,value) VALUES (0,'2017-02-23 12:00:00','breath-acetone','16')");
          db.run("INSERT INTO data (profile_id,timestamp,data_type,value) VALUES (0,'2017-02-24 06:00:00','breath-acetone','23')");
          db.run("INSERT INTO data (profile_id,timestamp,data_type,value) VALUES (0,'2017-02-24 12:00:00','breath-acetone','28')");
          db.run("INSERT INTO data (profile_id,timestamp,data_type,value) VALUES (0,'2017-02-25 06:00:00','breath-acetone','36')");
          db.run("INSERT INTO data (profile_id,timestamp,data_type,value) VALUES (0,'2017-02-25 12:00:00','breath-acetone','40')");
          db.run("INSERT INTO data (profile_id,timestamp,data_type,value) VALUES (0,'2017-02-18 06:00:00','blood-glucose','7.5')");
          db.run("INSERT INTO data (profile_id,timestamp,data_type,value) VALUES (0,'2017-02-18 12:00:00','blood-glucose','7.2')");
          db.run("INSERT INTO data (profile_id,timestamp,data_type,value) VALUES (0,'2017-02-19 06:00:00','blood-glucose','7.1')");
          db.run("INSERT INTO data (profile_id,timestamp,data_type,value) VALUES (0,'2017-02-19 12:00:00','blood-glucose','7.1')");
          db.run("INSERT INTO data (profile_id,timestamp,data_type,value) VALUES (0,'2017-02-20 06:00:00','blood-glucose','7.2')");
          db.run("INSERT INTO data (profile_id,timestamp,data_type,value) VALUES (0,'2017-02-20 12:00:00','blood-glucose','7.4')");
          db.run("INSERT INTO data (profile_id,timestamp,data_type,value) VALUES (0,'2017-02-21 06:00:00','blood-glucose','7.1')");
          db.run("INSERT INTO data (profile_id,timestamp,data_type,value) VALUES (0,'2017-02-21 12:00:00','blood-glucose','6.9')");
          db.run("INSERT INTO data (profile_id,timestamp,data_type,value) VALUES (0,'2017-02-22 06:00:00','blood-glucose','7.1')");
          db.run("INSERT INTO data (profile_id,timestamp,data_type,value) VALUES (0,'2017-02-22 12:00:00','blood-glucose','7.0')");
          db.run("INSERT INTO data (profile_id,timestamp,data_type,value) VALUES (0,'2017-02-23 06:00:00','blood-glucose','5.3')");
          db.run("INSERT INTO data (profile_id,timestamp,data_type,value) VALUES (0,'2017-02-23 12:00:00','blood-glucose','5.1')");
          db.run("INSERT INTO data (profile_id,timestamp,data_type,value) VALUES (0,'2017-02-24 06:00:00','blood-glucose','4.9')");
          db.run("INSERT INTO data (profile_id,timestamp,data_type,value) VALUES (0,'2017-02-24 12:00:00','blood-glucose','4.8')");
          db.run("INSERT INTO data (profile_id,timestamp,data_type,value) VALUES (0,'2017-02-25 06:00:00','blood-glucose','4.3')");
          db.run("INSERT INTO data (profile_id,timestamp,data_type,value) VALUES (0,'2017-02-25 12:00:00','blood-glucose','4.5')");

          db.run("INSERT INTO data (profile_id,timestamp,data_type,value) VALUES (0,'2017-02-18 06:00:00','blood-beta-hydroxybutyrate','0.9')");
          db.run("INSERT INTO data (profile_id,timestamp,data_type,value) VALUES (0,'2017-02-18 12:00:00','blood-beta-hydroxybutyrate','1.0')");
          db.run("INSERT INTO data (profile_id,timestamp,data_type,value) VALUES (0,'2017-02-19 06:00:00','blood-beta-hydroxybutyrate','1.1')");
          db.run("INSERT INTO data (profile_id,timestamp,data_type,value) VALUES (0,'2017-02-19 12:00:00','blood-beta-hydroxybutyrate','1.3')");
          db.run("INSERT INTO data (profile_id,timestamp,data_type,value) VALUES (0,'2017-02-20 06:00:00','blood-beta-hydroxybutyrate','1.6')");
          db.run("INSERT INTO data (profile_id,timestamp,data_type,value) VALUES (0,'2017-02-20 12:00:00','blood-beta-hydroxybutyrate','1.9')");
          db.run("INSERT INTO data (profile_id,timestamp,data_type,value) VALUES (0,'2017-02-21 06:00:00','blood-beta-hydroxybutyrate','2.2')");
          db.run("INSERT INTO data (profile_id,timestamp,data_type,value) VALUES (0,'2017-02-21 12:00:00','blood-beta-hydroxybutyrate','2.4')");
          db.run("INSERT INTO data (profile_id,timestamp,data_type,value) VALUES (0,'2017-02-22 06:00:00','blood-beta-hydroxybutyrate','2.6')");
          db.run("INSERT INTO data (profile_id,timestamp,data_type,value) VALUES (0,'2017-02-22 12:00:00','blood-beta-hydroxybutyrate','2.9')");
          db.run("INSERT INTO data (profile_id,timestamp,data_type,value) VALUES (0,'2017-02-23 06:00:00','blood-beta-hydroxybutyrate','3.1')");
          db.run("INSERT INTO data (profile_id,timestamp,data_type,value) VALUES (0,'2017-02-23 12:00:00','blood-beta-hydroxybutyrate','3.3')");
          db.run("INSERT INTO data (profile_id,timestamp,data_type,value) VALUES (0,'2017-02-24 06:00:00','blood-beta-hydroxybutyrate','3.6')");
          db.run("INSERT INTO data (profile_id,timestamp,data_type,value) VALUES (0,'2017-02-24 12:00:00','blood-beta-hydroxybutyrate','3.8')");
          db.run("INSERT INTO data (profile_id,timestamp,data_type,value) VALUES (0,'2017-02-25 06:00:00','blood-beta-hydroxybutyrate','4.1')");
          db.run("INSERT INTO data (profile_id,timestamp,data_type,value) VALUES (0,'2017-02-25 12:00:00','blood-beta-hydroxybutyrate','4.5')");

          db.run("INSERT INTO prefs (name,value) VALUES ('last-used-profile-id',0)");
	});
    },
    createDatabase: function() {
	console.log("createDatabase");
	return
		// var sqlite3 = require('sqlite3').verbose();
	var thePath = "";

	console.log("os.platform() returns "+os.platform());
	console.log("os.release() returns "+os.release());

	if( os.platform() == "darwin" ) {
		thePath = process.env.HOME;
		thePath += "/Library/Application Support/Ketonix";
		console.log("thePath="+thePath);
		// if( thePath ) thePath = thePath+'/';
		// console.log("thePath="+thePath);
		try {
			console.log("trying mkdirSync("+thePath+")");
			fs.mkdirSync(thePath);
			console.log("mkdirSync("+thePath+") ok");
		} catch (err) {
			console.log("mkdirSync("+thePath+") fail:"+err);
		}

		db = new sqlite3.Database(thePath+'/ketonix.db');
	}

	if( os.platform() == "win32" ) {
		var thePath = process.env.USERPROFILE;
		console.log("thePath="+thePath);
		if( thePath ) thePath = thePath+'\\';
		console.log("thePath="+thePath);

		db = new sqlite3.Database(thePath+'ketonix.db',sqlite3.OPEN_READWRITE|sqlite3.OPEN_CREATE,app.onOpenDatabase);

	}

	console.log("db is created");
	db.serialize(function() {
                  db.run("CREATE TABLE IF NOT EXISTS device (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT,uuid TEXT)");
                  // tx.executeSql("DROP TABLE IF EXISTS profiles"); 
                  db.run("CREATE TABLE IF NOT EXISTS profiles (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT,user TEXT, pass TEXT, gender TEXT, age INTEGER, usage TEXT, smoker TEXT, donate TEXT)");
		  // db.run("DELETE FROM profiles");
                  db.run("CREATE TABLE IF NOT EXISTS data (id INTEGER PRIMARY KEY AUTOINCREMENT, profile_id INTEGER,timestamp TEXT,data_type TEXT, value REAL)");
                  db.run("CREATE TABLE IF NOT EXISTS prefs (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT,value TEXT)");
		  // db.run("CREATE UNIQUE INDEX IF NOT EXISTS unique_data ON data(profile_id,timestamp,data_type) ON CONFLICT REPLACE");
		  // db.run("CREATE TRIGGER IF NOT EXISTS unique_data BEFORE INSERT ON data BEGIN DELETE FROM data WHERE old.profile_id = new.profile_id AND old.timestamp = new.timestamp AND old.data_type = new.data_type; END;");
		db.run("CREATE UNIQUE INDEX IF NOT EXISTS `unique_data` ON `data` (`profile_id` ,`timestamp` ,`data_type` )");
	});

	// SELECT ALL DATA
	console.log("debug all data in database:");
	db.serialize( function() {
		var i=0;
		var sql = "SELECT id,profile_id,timestamp,data_type,value FROM data";
		console.log(sql);
		db.each(sql,function(err,row) {
			console.log("Search Result:"+row.id+", "+
				row.profile_id+", "+
				row.timestamp+", "+
				row.data_type+", "+
				row.value);
		});
	});
	console.log("end of data in database:");
    },
    onNotifyError: function(error) {
	console.log("onNotifyError");
    },
    onDisconnect: function() {
	console.log("onDisconnect() bluetooth disconnected");
	firstFlag = true;
	secondFlag = true;
	lookForUsbDevice = true;
	alreadyFound = false;
	var connectMsg = "Connect your Ketonix";
	$("#connect-device-msg").text(connectMsg);
	$("#status-message").text("Device disconnected");
       	// noble.startScanning(["092cb9a14cbe475e9f56d29404dd29f1"],false);
	if( bluetoothIsOn && noble != null) noble.startScanning(["092cb9a14cbe475e9f56d29404dd29f1"]);
	// Start the usb scanning to
	lookForUsbDevice = true;
	setTimeout(app.lookForDevice,1000);
	$(":mobile-pagecontainer").pagecontainer("change","#home");
	$.unblockUI();
    },
    onData: function(data, isNotification) {
	console.log("got data");
	console.log("data.length:"+data.length);
	var valArr = new Uint16Array(data);
	var type = valArr[0];
	// var readyBit = valArr[1];
	var readyBit = valArr[2];
	// var gotValue=valArr[2];
	var gotValue=valArr[4];
	// var raw = valArr[3];
	var raw = (valArr[6] << 0) + (valArr[7] << 8);
	console.log("type: "+type);
	console.log("ready: "+readyBit);
	console.log("raw: "+raw);
	console.log("value: "+gotValue);
	if( type >= 2 ) {
		$("#range-zoom-div").show();
	} else {
		$("#range-zoom-div").hide();
	}
	// var gotValue =  0.1385*Math.exp(0.0077*(raw));
	var gotValue =  0.3453*Math.exp(0.0079*(raw)) - 0.76;
	if( gotValue < 1.0 ) gotValue = 0.0;
	if( readyBit == 0 ) { if( !secondFlag ) { $.blockUI( { message: "Warming up ..." } ); secondFlag = true; } }
	if( readyBit == 1 ) { if( secondFlag ) { $.unblockUI(); secondFlag = false; } }
	if( readyBit == 1 ) {
		if( afterSave == false ) {
			console.log("afterSave == false");
			maxValue = gotValue > maxValue ? gotValue : maxValue;
			if( maxValue > 0 ) {
				console.log("maxValue > 0 ("+maxValue+")");
				$("#status-message").text("...");
				$('#save-measure-button').removeClass('ui-state-disabled');
			} else {
				console.log("maxValue <= 0 ("+maxValue+")");
				$("#status-message").text("Ready");
				if( currentProfileId == -1) {
					$("#status-message").text("No profile selected!");
				}
			}
		} else {
			maxValue = gotValue;
			console.log("afterSave == true ("+maxValue+")");
			if( gotValue < 1 ) {
				console.log("Ready");
				if( currentProfileId == -1) {
					$("#status-message").text("No profile selected!");
				}
				afterSave = false; // value is back to zero
				console.log("SETTING CLASSIC MODE");
			} else {
				console.log("gotValue >= 1 ("+gotValue+")");
				$("#status-message").text("Wait ..."); //  ("+gotValue+")");
				$('#save-measure-button').addClass('ui-state-disabled');
			}
		}
		gaugePPM.value = maxValue;
	} else {
		$("#status-message").text(":");
		if( firstFlag == true ) {
			var msgText = "Wait, warming up";
			console.log(msgText);
			$.blockUI( { message: msgText });
			firstFlag = false;
			secondFlag = true;
			maxValue = 0;
		}
	}
    },
    onceNotify: function(state) {
	console.log("onceNotify");
    },
    onDeviceReady: function() {
	console.log("onDeviceReady(start)");
        app.refreshDeviceList();
	app.createDatabase();
	try {
		app.reloadProfiles();
	} catch (err) {
		console.log(err);
	}
	var nuda = new Date().format("%Y-%m-%d");
	var nudahhmm = new Date().format("%Y-%m-%d %H:%M");
	$("#data-timestamp").text(nudahhmm);
	$("#analyze-from").text(nuda);
	$("#analyze-to").text(nuda);
	app.selectLastUsedProfile();
	app.useLastUsedZoom();
	app.useLastCalibration(); // Sets uiCalibration
	ignoreZoom = false;
	console.log("onDeviceReady(end)");
    },
    bleSubscribeCallback: function(error) {
	console.log("bleSubscribeCallback()");
    },
    foundPeripheral: function(peripheral) {
	    console.log("foundPeripheral()");

	    if( alreadyFound )  return;
	    alreadyFound = true;

  	// we found a peripheral, stop scanning
  	if( noble != null ) noble.stopScanning();
	// we dont need to scan for usb devices
	lookForUsbDevice = false;

	console.log('peripheral discovered (' + peripheral.id +
              ' with address <' + peripheral.address +  ', ' + peripheral.addressType + '>,' +
              ' connectable ' + peripheral.connectable + ',' +
              ' RSSI ' + peripheral.rssi + ':');
  	console.log('\thello my local name is:');
  	console.log('\t\t' + peripheral.advertisement.localName);
  	console.log('\tcan I interest you in any of the following advertised services:');
  	console.log('\t\t' + JSON.stringify(peripheral.advertisement.serviceUuids));


	// app.onDiscoverDevice(peripheral);
  	//
  	// The advertisment data contains a name, power level (if available),
  	// certain advertised service uuids, as well as manufacturer data,
  	// which could be formatted as an iBeacon.
  	//
  	console.log('found peripheral:', peripheral.advertisement);
  	//
  	// Once the peripheral has been discovered, then connect to it.
  	//
  	peripheral.connect(function(err) {
		//
		// Once the peripheral has been connected, then discover the
		// services and characteristics of interest.
		//
		var connectMsg = "Connected via Bluetooth(R)";
		$("#connect-device-msg").text(connectMsg);

		console.log("registering onDisconnect()");
		peripheral.once('disconnect', app.onDisconnect);

		console.log("discover services()");
		// peripheral.discoverServices(["092CB9A14CBE475E9F56D29404DD29F1"], function(err, services) {
		peripheral.discoverServices(["092cb9a14cbe475e9f56d29404dd29f1"], function(err, services) {

			console.log("found services()");

			services.forEach(function(service) {
				//
				// This must be the service we were looking for.
				//
				console.log('found service:', service.uuid);
				
				service.discoverCharacteristics([], function(err, characteristics) {
					characteristics.forEach(function(characteristic) {
						console.log("found characteristic:"+characteristic.uuid);
						if( characteristic.uuid == "092CB9A14CBE475E9F56D29404DD0003" || characteristic.uuid == "092cb9a14cbe475e9f56d29404dd0003" ) {
							characteristic.notify(true, app.onNotifyError);
							// characteristic.once('notify', app.onceNotify);
							characteristic.on('data', app.onData);
							// characteristic.once('read', app.onData);
							console.log("subscribing to characteristic:"+characteristic.uuid);
							characteristic.subscribe(app.bleSubscribeCallback);
							$(":mobile-pagecontainer").pagecontainer("change","#measure");
							$("#status-message").text(" ");
						}

					});
				});
			});
	        });
	});
    },
    refreshDeviceList: function() {
        deviceList.innerHTML = ''; // empties the list
	console.log("registering noble on stateChange");
	if( noble != null ) {
		noble.on('stateChange', function(state) {
			console.log("state is :"+state);
			if( state == 'poweredOn') {
				console.log("registering noble on discover");
			       if( noble != null) noble.on('discover', app.foundPeripheral);
				console.log("noble startScanning()");
			       // noble.startScanning(["092CB9A14CBE475E9F56D29404DD29F1"],false);
				bluetoothIsOn = true;
			       if( noble != null) noble.startScanning(["092cb9a14cbe475e9f56d29404dd29f1"]);
			} else {
				console.log("noble stopScanning()");
				if( noble != null) noble.stopScanning();
			}
	});
	}
    },
    hideDiagram: function(whichData) {
	$("#li-"+whichData).remove();
    },
    setLastUsedZoom: function(zoom) {
	console.log("setLastUsedZoom("+(zoom ? "true" : "false")+")");
	try {

		db.serialize( function() {
			var sql = "DELETE FROM prefs WHERE name='last-used-zoom'"
			console.log(sql);
			db.run(sql);
			sql = "INSERT INTO prefs (name,value) VALUES ('last-used-zoom','"+(zoom ? "true" : "false")+"')";
			console.log(sql);
			db.run(sql);
		});
		/*
		db.serialize( function() {
			var sql = "REPLACE INTO prefs (name,value) VALUES (?,?)";
			console.log(sql);

			var stmt = db.prepare(sql);
			stmt.run("last-used-zoom",(zoom ? "true" : "false"));
			stmt.finalize();
		});
		*/
	} catch (err) {
		console.log("setLastUsedZoom:"+err);
	}
	console.log("setLastUsedZoom(finished)");
    },
    setLastUsedProfile: function(id) {
	try {
		db.serialize( function() {
			var sql = "DELETE FROM prefs WHERE name='last-used-profile-id'";
			console.log(sql);
			db.run(sql);
			sql = "INSERT INTO prefs (name,value) VALUES ('last-used-profile-id',"+id+")";
			console.log(sql);
			db.run(sql);
			// var sql = "REPLACE INTO prefs (name,value) VALUES (?,?)";
			// console.log(sql);
			// var stmt = db.prepare(sql);
			// stmt.run("last-used-profile-id",id);
			// stmt.finalize();
		});
	} catch (err) {
		console.log("setLastUsedProfile:"+err);
	}
    },
    useLastCalibration: function() {
	try {
		db.serialize( function() {
			var sql = "SELECT name,value FROM prefs where name='calibration'";
			console.log(sql);
			db.each(sql,[],function(err,row) {
				console.log("useLastCalibration(): value =  "+row.value);
				if( Number(row.value) == NaN ) {
					uiCalibration =  0;
				} else {				
					uiCalibration =  Number(row.value);
				}
			}, function() {
				console.log("finishe useLastCalibration(): value =  "+ uiCalibration );
			});
		});
	} catch (err) {
		console.log("useLastCalibration: "+err);
	}
    },
    useLastUsedZoom: function() {
	console.log("useLastUsedZoom(start)");
	try {
		db.serialize( function() {
			var sql = "SELECT name,value FROM prefs where name='last-used-zoom'";
			console.log(sql);
			db.each(sql,[],function(err,row) {
				console.log("useLastUsedZoom(): zoomOn , row.value =  "+row.value);
				zoomOn = (row.value == "true" ? true : false);
				if( zoomOn  == true ) {
					console.log("set range-zoom to checked");
					ignoreZoom = true;
					$("#range-zoom").flipswitch().prop("checked",true).flipswitch("refresh");
					gaugePPM = recreateRadialGauge()
					gaugePPM.draw();
					ignoreZoom = false;
				} else {
					console.log("set range-zoom to un-checked");
					ignoreZoom = true;
					$("#range-zoom").flipswitch().prop("checked",false).flipswitch("refresh");
					gaugePPM = recreateRadialGauge()
					gaugePPM.draw();
					ignoreZoom = false;
				}
			}, function() {
				console.log("useLastUsedZoom("+(zoomOn ? "true":"false")+") finished");
			});
		});
	} catch (err) {
		console.log("useLastUsedZoom: "+err);
	}
    },
    selectLastUsedProfile: function() {
	try {
		var last_used_profile_id = "";
		db.serialize( function() {
			var sql = "SELECT name,value FROM prefs where name='last-used-profile-id'";
			console.log(sql);
			db.each(sql,[],function(err,row) {
				last_used_profile_id = row.value;
				console.log("last-used-profile-id = "+last_used_profile_id);
			}, function() {
				var sql2 = "select name from profiles where id="+last_used_profile_id;
				console.log(sql2);
				db.serialize( function() {
					db.each(sql2,[],function(err,row2) {
						console.log("select last used profile: err="+err);
						var last_used_profile_name = row2.name;
						console.log("profile name for "+last_used_profile_id+" is "+last_used_profile_name);
						// set the profile below ...
						currentProfileId = last_used_profile_id;
						$("#profile-autocomplete").val(last_used_profile_name);
						currentProfile=last_used_profile_name;
						app.fillProfile(last_used_profile_name);
						$("#select-profile-anchor").text(last_used_profile_name);
						$("#select-profile-anchor").html(last_used_profile_name);
						$("#select-profile-anchor").trigger("refresh");
					}, function() {
						console.log("selectLastUsedProfile() finished");
					});
				});
			});
		});
	} catch (err) {
		console.log("selectLastUsedProfile: "+err);
	}
    },
    showDataPoints: function() {
	try {
		var foundData = new Array();
		console.log("start collecting data ");
		var startDate = $("#analyze-from").val()+" 00:00";
		var endDate = $("#analyze-to").val()+" 23:59";
		$("#edit-data-point-list").empty();
		console.log("select data in database:");
		db.serialize( function() {
			var i=0;
			var sql = "SELECT id,profile_id,timestamp,data_type,value FROM data where profile_id='"+currentProfileId+"' and timestamp > '"+startDate+"' and timestamp < '"+endDate+"' order by timestamp asc";
			console.log(sql);
			db.each(sql,function(err,row) {
				console.log("Search Result:"+row.id+", "+
					row.profile_id+", "+
					row.timestamp+", "+
					row.data_type+", "+
					row.value);
        			$('#edit-data-point-list').mobiscroll('add', row.id,"<h2>"+row.timestamp+"</h2> "+row.data_type+" = "+ row.value);
			});
			console.log("after listview refresh");
		});
	} catch (err) {
		console.log("Error drawing chart:"+err);
	}
    },
    showDiagram: function(whichData,theLabel) {
	try {
		var foundData = new Array();
		console.log("start drawing "+whichData);
		var startDate = $("#analyze-from").val()+" 00:00";
		var endDate = $("#analyze-to").val()+" 23:59";
		console.log("select "+whichData+" in database:");
		db.serialize( function() {
			var i=0;
			var sql = "SELECT id,profile_id,timestamp,data_type,value FROM data where profile_id='"+currentProfileId+"' and data_type='"+whichData+"' and timestamp > '"+startDate+"' and timestamp < '"+endDate+"' order by timestamp asc";
			console.log(sql);
			db.each(sql,[],function(err,row) {
				if( err ) console.log(err);
				console.log("Search Result:"+row.id+", "+
					row.profile_id+", "+
					row.timestamp+", "+
					row.data_type+", "+
					row.value);
				foundData[i++] = new DataPoint(row.timestamp,row.value);
			}, function() {
				console.log("search ok ( number of datas:"+i+")");
				var aChartListItem = document.createElement('li');
				aChartListItem.id = "li-"+whichData;
				console.log("debug 1");
				aChartListItem.innerHTML = "<p></p><canvas id='canvas-"+whichData+"'></canvas>";
				console.log( "<p>"+whichData+"</p><canvas id='canvas-"+whichData+"' width='400' height='400'></canvas>");
				console.log("debug 2");
				chartList.appendChild(aChartListItem);
				console.log("debug 3");
				var conf = new Visconfig(theLabel);
				// var ctx = document.getElementById("canvas-"+whichData).getContext('2d'); 
				var ctx = document.getElementById("canvas-"+whichData); 
				conf.data.datasets[0].data = foundData; 
				var chart = new Chart(ctx, conf);
				console.log("finished drawing "+whichData);

				if( os.platform() == "win32" ){
					$("#chartList").listview("refresh");
				}
			});
		});
	} catch (err) {
		console.log("Error drawing chart:"+err);
	}
    },
    onDiscoverDevice: function(device) {
	var listItem = document.createElement('li');
	var html = '<a href="#" id="'+device.id+'" class="ui-btn"><img src="img/'+device.name+'.png" class="ui-li-thumb" id="'+device.id+'"></img><h2 id="'+device.id+'">'+device.name+'</h2><p>'+device.id+'</p></a>';
	listItem.innerHTML = html;
	listItem.className="ui-li-has-thumb";
	listItem.dataset.deviceId = device.id;
	console.log("setting dataset.deviceId = "+device.id);
	console.log(listItem);
	deviceList.appendChild(listItem);
    },
    doDebug: function(str) {
        var debugItem = document.createElemenr('li'),
            html = '<b>' + str + '</b>';
        deviceList.appendChild(debugItem);
    },
    isConnected: function() {
	console.log("isConnected()");
    },
    isDisConnected: function() {
	console.log("isDisConnected()");
    },
    connect: function(e) {

	console.log("connect()");

        var deviceId = e.target.id;
	console.log("deviceId = "+deviceId);
	if( deviceId == undefined ) {
		alert("deviceId is undefined");
		$.mobile.loading('hide');
		$.unblockUI();
		console.log(">>>>>>>>>>>>>>>>> unblockUI() connect() <<<<<<<<<<<<<<<<<<<<");
		return;
	}

	var onConnect = function() {
		/*
		$.mobile.loading( 'hide');
                disconnectButton.dataset.deviceId = deviceId;
		$('#disconnectButton').removeClass('ui-state-disabled');
		$('#deviceList').addClass('ui-state-disabled');
		theDeviceId = deviceId;
                ble.startNotification(deviceId, ketonixBLE.service, ketonixBLE.level, app.onKetonixLevelChange, app.onError);
		$(":mobile-pagecontainer").pagecontainer("change","#measure");
                app.initGauge();
                gaugePPM.value = 0.0;
		ble.isConnected(deviceId,app.isConnected,app.isDisConnected);
		*/
        };
	/*
	$.mobile.loading( 'show', {
		text: 'Connecting ...',
		textVisible: true,
		textOnly: true,
		theme: 'a',
		html: ""
	});
	*/
	
	$.blockUI( { message: "Connecting ..." });

        /* ble.connect(deviceId, onConnect, app.onError); */
    },
    getKetonixValue: function() {
        console.log("getKetonixValue()");
    },
    initGauge: function() {
        gaugePPM.value = 0;
        gaugePPM.draw();
    },
    onKetonixLevelChange: function(indata) {
        var gotValue=0;
        try {
                console.log("onKetonixLevelChange()");
                // console.log("indata: "+indata);
                var valArr = new Uint16Array(indata);
                var type = valArr[0];
		var readyBit = valArr[1];
                gotValue=valArr[2];
		var raw = valArr[3];
                console.log("type: "+type);
                console.log("ready: "+readyBit);
		console.log("raw: "+raw);
                console.log("value: "+gotValue);
	
		if( readyBit == 1 ) {
			console.log("readyBit == 1");
			if( afterSave == false ) {
				console.log("afterSave == false");
				maxValue = gotValue > maxValue ? gotValue : maxValue;
				if( maxValue > 0 ) {
					console.log("maxValue > 0 ("+maxValue+")");
					$("#status-message").text("...");
					$('#save-measure-button').removeClass('ui-state-disabled');
				} else {
					console.log("maxValue <= 0 ("+maxValue+")");
					$("#status-message").text("Ready");
					console.log("SETTING CLASSIC MODE");
					device.write([0x00,0x42]); // CLASSIC MODE
					if( currentProfileId == -1) {
						$("#status-message").text("No profile selected!");
					}
				}
			} else {
				maxValue = gotValue;
				console.log("afterSave == true ("+maxValue+")");
				if( gotValue < 1 ) {
					console.log("Ready");
					console.log("SETTING CLASSIC MODE");
					device.write([0x00,0x42]); // CLASSIC MODE
					if( currentProfileId == -1) {
						$("#status-message").text("No profile selected!");
					}
					afterSave = false; // value is back to zero
				} else {
					console.log("gotValue >= 1 ("+gotValue+")");
					$("#status-message").text("wait ..."); //  ("+gotValue+")");
					$('#save-measure-button').addClass('ui-state-disabled');
				}
			}
		} else {
			$("#status-message").text("Warming up");
		}

         } catch (err) {
                console.log("Caught Exception: "+err);
                gotValue=0;
         }
         gaugePPM.value = maxValue; // gotValue;
         gaugePPM.draw();
    },
    disconnect: function(event) {
	console.log("disconnecting now");
        var deviceId = event.target.dataset.deviceId;
	if( deviceId == undefined ) deviceId = theDeviceId; 
	gaugePPM.value = 0;
	$('#disconnectButton').addClass('ui-state-disabled');
	$('#deviceList').removeClass('ui-state-disabled');
        // ble.disconnect(deviceId, app.showHomePage, app.onError);
    },
    showHomePage: function() {
	$( ":mobile-pagecontainer" ).pagecontainer( "change", "#home");
    },
    showMeasurePage: function() {
	$( ":mobile-pagecontainer" ).pagecontainer( "change", "#measure");
    },
    showAnalyzePage: function() {
	$( ":mobile-pagecontainer" ).pagecontainer( "change", "#analyze");
    },
    deleteDataPoint: function(id) {
	try {
		// $("#li-"+id).remove();
		// $("#edit-data-point-list").listview("refresh");
		console.log("deleteDataPoint("+id+")");
		var sql = "DELETE FROM data where id='"+id+"'";
		console.log(sql);
		db.run( sql );
		console.log("data point "+id+" is deleted");
		app.showDatapoints();
	} catch (err) {
		console.log(err);
	}
    },
    confirmDialog: function(text, callback, arg) {
	var popupDialogId = 'popupDialog';
	$('<div data-role="popup" id="' + popupDialogId + '" data-confirmed="no" data-transition="pop" data-overlay-theme="b" data-theme="b" data-dismissible="false" style="max-width:500px;"> \
			    <div data-role="header" data-theme="a">\
				<h1>Question</h1>\
			    </div>\
			    <div role="main" class="ui-content">\
				<h3 class="ui-title">' + text + '</h3>\
				<a href="#" class="ui-btn ui-corner-all ui-shadow ui-btn-inline ui-btn-b optionConfirm" data-rel="back">Yes</a>\
				<a href="#" class="ui-btn ui-corner-all ui-shadow ui-btn-inline ui-btn-b optionCancel" data-rel="back" data-transition="flow">No</a>\
			    </div>\
			</div>')
	    .appendTo($.mobile.pageContainer);
	var popupDialogObj = $('#' + popupDialogId);
	popupDialogObj.trigger('create');
	popupDialogObj.popup({
	    afterclose: function (event, ui) {
		popupDialogObj.find(".optionConfirm").first().off('click');
		var isConfirmed = popupDialogObj.attr('data-confirmed') === 'yes' ? true : false;
		$(event.target).remove();
		if (isConfirmed && callback) {
		    callback( arg );
		}
	    }
	});
	popupDialogObj.popup('open');
	popupDialogObj.find(".optionConfirm").first().on('click', function () {
	    popupDialogObj.attr('data-confirmed', 'yes');
	});
    },
    parseCSV: function(data) {

		var sql = "";
		var profile_id = 0;
		var profile_user = "";
		var profile_pass = "";
		var profile_gender = "";
		var profile_age = 0;
		var profile_usage = "";
		var profile_smoker = "";
		var profile_donate = "";

		console.log("parseCSV(start)");


		if(currentProfile == "") {
			$("#status-message").text("No profile, can't save ..");
			return;
		}

		db.serialize( function() {
			sql = "SELECT id,user,pass,gender,age,usage,smoker,donate FROM profiles WHERE name='"+currentProfile+"'";
			db.each(sql,[],function(err,row) {
				profile_id = row.id;
				profile_user = row.user;
				profile_pass = row.pass;
				profile_gender = row.gender;
				profile_age = row.age;
				profile_usage = row.usage;
				profile_smoker = row.smoker;
				profile_donate = row.donate;
				console.log("saving measure to "+currentProfile+"(id:"+profile_id+")");
			}, function() {

				var i=0;
				var v_value = 0;
				var v_what = "";
				var v_date = "";
				var v_time = "";
				var rows = data.split("\n");
				for(i=0;i<rows.length-1;i++ ) {
					console.log("Row:"+rows[i]);
					var tok = rows[i].split(";");
					v_date = tok[0];
					v_time = tok[1];
					v_what = tok[2];
					v_value = tok[3];


					if( v_what == "AcetonePPM" ) v_what = "breath-acetone";

					if( v_what == "Ketonix" ) v_what = "ketonix-units";

					if( v_what == "ExerciseTime" ) v_what = "exercise-length";
					if( v_what == "CaloriesOut" ) v_what = "exercise-calories";
					if( v_what == "ExerciseIntensity" ) v_what = "exercise-intensity";
					if( v_what == "ExerciseType" ) v_what = "exercise-type";
					if( v_what == "ExerciseFun" ) v_what = "exercise-fun";

					if( v_what == "LDLP" ) v_what = "blood-ldl-p";
					if( v_what == "SmallLDL" ) v_what = "blood-small-ldl-p";
					if( v_what == "LDLC" ) v_what = "blood-ldl-c";
					if( v_what == "HDLC" ) v_what = "blood-hdl-c";
					if( v_what == "Triglycerides" ) v_what = "blood-triglycerides";
					if( v_what == "Cholesterol" ) v_what = "blood-total-cholesterol";
					if( v_what == "VLDL" ) v_what = "blood-vldl";
					if( v_what == "Systolic" ) v_what = "blood-systolic";
					if( v_what == "Diastolic" ) v_what = "blood-diastolic";
					if( v_what == "Pulse" ) v_what = "blood-pulse";
					if( v_what == "Beta-HydroxyButyrate" ) v_what = "blood-beta-hydroxybutyrate";
					if( v_what == "Glucose" ) v_what = "blood-glucose";
					
					if( v_what == "Fat" ) v_what = "meal-fat";
					if( v_what == "Protein" ) v_what = "meal-protein";
					if( v_what == "Carbohydrates" ) v_what = "meal-carb";
					if( v_what == "KetoRatio" ) v_what = "meal-keto-ratio";
					if( v_what == "CaloriesIn" ) v_what = "meal-calories";
					if( v_what == "Water" ) v_what = "meal-water";
					if( v_what == "Alcohol" ) v_what = "meal-alcohol";

					if( v_what == "Height" ) v_what = "body-height";
					if( v_what == "Neck" ) v_what = "body-neck";
					if( v_what == "UpperArm" ) v_what = "body-upper-arm";
					if( v_what == "Chest" ) v_what = "body-chest";
					if( v_what == "Waist" ) v_what = "body-waist";
					if( v_what == "Hip" ) v_what = "body-hips";
					if( v_what == "Thigh" ) v_what = "body-thigh";
					if( v_what == "Calf" ) v_what = "body-calf";
					if( v_what == "Weight" ) v_what = "body-weight";
					if( v_what == "BodyFat" ) v_what = "body-fat";

					console.log("importing ["+v_date+" "+v_time+","+v_what+","+v_value+"]");

					sql = "INSERT INTO data (profile_id,timestamp,data_type, value) VALUES ("+profile_id+",'"+v_date+" "+v_time+"','"+v_what+"',"+v_value+")";
					try {
						db.run(sql,[],function() {
							console.log("parseCSV INSERT ("+sql+") transaction finished");
						});
					} catch (uerr) {
						console.log("importing same data again!?");
					}
					console.log("parseCSV("+sql+")");
				}
				console.log("parseCSV(finished)");
				$('#import-csv-file').val("");
				// CLOSE data-panel
				$( "#data-panel" ).panel( "close");
				$("#status-message").text("Data was splendidly imported!");
			});
		});
    },
    importCSV: function(csvfile) {
	console.log("importCSV("+csvfile+")");
	if(currentProfile == "") {
		alert("Please select a profile before importing data ..");
		return;
	}
	var rawFile = new XMLHttpRequest();
	rawFile.open("GET", "file://"+csvfile, false);
	rawFile.onreadystatechange = function ()
	{
		if(rawFile.readyState === 4)
		{
		    if(rawFile.status === 200 || rawFile.status == 0)
		    {
			var allText = rawFile.responseText;
			app.parseCSV(allText);
		    }
		}
	}
	rawFile.send(null);
    },
    askDeleteDataPoint: function(id,text) {
	// alert("deleteDataPoint("+id+")");
	console.log("askDeleteDataPoint("+id+")");
	// navigator.notification.confirm(text+"?", app.deleteDataPoint(id), "Delete", ['Yes','Cancel']);
	app.confirmDialog("Delete "+text+"?", app.deleteDataPoint, id);
    },
    onError: function(reason) {
	// $.mobile.loading( 'hide');
	$.unblockUI();
	console.log(">>>>>>>>>>>>>>>>> unblockUI() onError() <<<<<<<<<<<<<<<<<<<<");
        console.log("ERROR: " + reason);
    },
    updateGauge: function() {
	    console.log("updateGauge()");
	    try {

		try {
			device.write([0x00,0x37]);
			device.read(function updateIt(err,data) {
				if( data == undefined ) { 
					$("#status-message").text("Device disconnected");
					$(":mobile-pagecontainer").pagecontainer("change","#home");
					$("#range-zoom-div").hide();
					// $.mobile.loading( "hide" );
					$.unblockUI();
					console.log(">>>>>>>>>>>>>>>>> unblockUI() updateGauge() <<<<<<<<<<<<<<<<<<<<");
			
       					// noble.startScanning(["092cb9a14cbe475e9f56d29404dd29f1"],false);
					if( bluetoothIsOn && noble != null ) noble.startScanning(["092cb9a14cbe475e9f56d29404dd29f1"]);
					lookForUsbDevice = true;
					setTimeout(app.lookForDevice,3000);
				}
				deviceType = (data[15] + (data[16] << 8));
				theDeviceId = (data[17] + (data[18] << 8));
				var val = (data[1] + (data[2] << 8));
				var raw = (data[3] + (data[4] << 8));
				var warm = (data[5] + (data[6] << 8));
				var cal = (data[13] + (data[14] << 8));

				var green = (data[7] + (data[8] << 8))/10;
				var yellow = (data[9] + (data[10] << 8))/10;
				var red = (data[11] + (data[12] << 8))/10;

				if( deviceType == 2 ) {
					var g = 0.1385*Math.exp(0.0077*green*10);
					var y = 0.1385*Math.exp(0.0077*yellow*10);
					var r = 0.1385*Math.exp(0.0077*red*10);
					green = g;
					yellow = y;
					red = r;
				} else  if( deviceType == 4 ) {
					var g = 0.3453*Math.exp(0.0079*green*10);
					var y = 0.3453*Math.exp(0.0079*yellow*10);
					var r = 0.3453*Math.exp(0.0079*red*10);
					green = g;
					yellow = y;
					red = r;
				} 

				if( saved_green != green || saved_yellow != yellow || saved_red != red ) {
					saved_green = green;
					saved_yellow = yellow;
					saved_red = red;
					gaugePPM = recreateRadialGauge()
					gaugePPM.draw();
				}

				console.log("id="+theDeviceId+", cal="+cal+", green="+green+", yellow="+yellow+", red="+red);

				if( deviceType >= 2 ) {
					$("#range-zoom-div").show();
				} else {
					$("#range-zoom-div").hide();
				}

				var rc = raw - cal < 0 ? 0 : raw-cal;
				var gotValue =  0;
				var ready = warm >= 100 ? 1 : 0;
				// if( ready == 0 ) { if( !secondFlag ) { $.blockUI( { message: "Warming up ..."} ); secondFlag = true; } }
				if( ready == 1 ) { if( secondFlag ) { $.unblockUI(); secondFlag = false; } }

				console.log("deviceType="+deviceType);
				console.log("warm="+warm);
				console.log("ready="+ready);
				console.log("uiCalibration="+uiCalibration);
				console.log("raw="+raw);
				var adjust_value =  0.1385*Math.exp(0.0077*(uiCalibration))- 0.1385*Math.exp(0.0077*(100));
				console.log("adjust value = "+adjust_value);

				if( deviceType < 2 ) {
					console.log("using old equipment");
					gotValue =  Math.round(val*100/1024);
					if( gotValue < 5 ) gotValue = 0;
				} else if( deviceType == 2 ) {
					console.log("using new equipment");
					gotValue =  0.1385*Math.exp(0.0077*(raw));
					console.log("gotValue() = "+gotValue);
					gotValue -= adjust_value;
					console.log("gotValue(adjusted by "+adjust_value+") = "+gotValue);
				} else if( deviceType == 4 ) {
					console.log("using new bluetooth equipment");
					gotValue =  0.3453*Math.exp(0.0079*(raw)) - 0.76;
					console.log("gotValue() = "+gotValue);
					gotValue -= adjust_value;
					console.log("gotValue(adjusted by "+adjust_value+") = "+gotValue);
				}

				console.log("raw="+raw);
				console.log("val="+val);

				if( gotValue < 1.0 ) gotValue = 0.0;

				if( ready == 1 ) {
					if( afterSave == false ) {
						console.log("afterSave == false");
						maxValue = gotValue > maxValue ? gotValue : maxValue;
						if( maxValue > 0 ) {
							console.log("maxValue > 0 ("+maxValue+")");
							$("#status-message").text("...");
							$('#save-measure-button').removeClass('ui-state-disabled');
						} else {
							console.log("maxValue <= 0 ("+maxValue+")");
							$("#status-message").text("Ready");
							if( currentProfileId == -1) {
								$("#status-message").text("No profile selected!");
							}
						}
					} else {
						maxValue = gotValue;
						console.log("afterSave == true ("+maxValue+")");
						if( gotValue < 1 ) {
							console.log("Ready");
							if( currentProfileId == -1) {
								$("#status-message").text("No profile selected!");
							}
							afterSave = false; // value is back to zero
							console.log("SETTING CLASSIC MODE");
							device.write([0x00,0x42]); // CLASSIC MODE
						} else {
							console.log("gotValue >= 1 ("+gotValue+")");
							$("#status-message").text("Wait ..."); //  ("+gotValue+")");
							$('#save-measure-button').addClass('ui-state-disabled');
						}
					}
					gaugePPM.value = maxValue;
				} else {
					$("#status-message").text(":");
					if( firstFlag == true ) {
						var msgText = "Wait, warming up";
						console.log(msgText);
						$.blockUI( { message: msgText });
						firstFlag = false;
						secondFlag = true;
					}
					/*
					$.mobile.loading( "show", {
					            text: msgText,
					            textVisible: true,
					            theme: "a",
					            textonly: false,
					            html: ""
					});
					*/
					// gaugePPM.value = warm;
				}

				if(deviceType < 2) {
					if( currentUnit != "Units" ) {
	                                	gaugePPM = createRadialGauge('Units',green,yellow,red);
	                                	console.log(">>>>>>>>>>>>>>>> gaugePPM = createRadialGauge('Units',"+green+","+yellow+","+red+")");
						maxValue = 0;
					}
				}
				if( deviceType >= 2 ) {
					if( currentUnit != "PPM" ) {
						// Convert unit settings into PPM settings
						// HERE
						var g = 0.1385*Math.exp(0.0077*green*10);
						var y = 0.1385*Math.exp(0.0077*yellow*10);
						var r = 0.1385*Math.exp(0.0077*red*10);

						if( deviceType == 4 ) {

							g = 0.3453*Math.exp(0.0077*green*10);
							y = 0.3453*Math.exp(0.0077*yellow*10);
							r = 0.3453*Math.exp(0.0077*red*10);
						}

	                                	console.log("0) gaugePPM = createRadialGauge('PPM',"+g+","+y+","+r+")");
	                                	gaugePPM = createRadialGauge('PPM',g,y,r);
						maxValue = 0;
					}
				}
				gaugePPM.draw();
				console.log("gaugePPM.value="+maxValue);
	    			setTimeout(app.updateGauge,1000);
			});
		} catch (err) {
			// alert(err);
			console.log(err);
			$("#status-message").text("Device disconnected"); //  ("+gotValue+")");
			$(":mobile-pagecontainer").pagecontainer("change","#home");
			$("#range-zoom-div").hide();
			// disable settings-button
			$('#settings-button').addClass('ui-state-disabled');
	    		lookForUsbDevice = true;
			$.unblockUI();
			gaugePPM.value = 0;
			gaugePPM.draw();
			device = null;
			if( bluetoothIsOn && noble != null ) noble.startScanning(["092cb9a14cbe475e9f56d29404dd29f1"]);
	    		setTimeout(app.lookForDevice,1000);
		}

	    } catch ( err ) {
		$.unblockUI();
		device = null;
	    	lookForUsbDevice = true;
		if( bluetoothIsOn && noble != null ) noble.startScanning(["092cb9a14cbe475e9f56d29404dd29f1"]);
	    	setTimeout(app.lookForDevice,1000);
	    }
    },
    lookForDevice: function() {
	    console.log("lookForDevice()");
	    // return; // HERE
	    if( lookForUsbDevice == false ) { 
		console.log("lookForUsbDevice == false");
		return;
	    }
	    try {
	    	console.log("lookForDevice()");
	    	//hid = null;
		//hid = require('node-hid');
		device = new hid.HID(1240,62547);
		// console.log("SET CLASSIC MODE");
		// device.write([0x00,0x42]); // CLASSIC MODE
		console.log("SET CONTINOUS MODE");
		device.write([0x00,0x43]); // CONTINOUS MODE

		// lets stop searching for bluetooth
  		if( noble != null ) noble.stopScanning();
		// we already have a usb device, stop searching
		lookForUsbDevice = false;

		// Find out device type and enable/disable factory settings
		try {
			device.write([0x00,0x37]);
			device.read(function updateIt(err,data) {
				if( data != undefined ) { 
					deviceType = (data[15] + (data[16] << 8));
					theDeviceId = (data[17] + (data[18] << 8));
					console.log("lookForDevice() found type "+deviceType+", id "+theDeviceId);
					var connectMsg = "Connected via USB";
					if( theDeviceId > 0 ) {
						console.log("theDeviceId:"+theDeviceId);
						connectMsg = connectMsg + ": ID " + theDeviceId;
					} else {
						console.log("no device id");
					}
					$(":mobile-pagecontainer").pagecontainer("change","#measure");
    					app.useLastCalibration();
					maxValue = 0;
					console.log("setting connectMsg to "+connectMsg);
					$("#connect-device-msg").text(connectMsg);
					$("#status-message").text(connectMsg);
					$('#settings-button').removeClass('ui-state-disabled');
					if( deviceType < 2 ) {
						$('#blue-factory-button').removeClass('ui-state-disabled');
						$('#red-factory-button').removeClass('ui-state-disabled');
						$('#usb-factory-button').addClass('ui-state-disabled');
					} else {
						$('#blue-factory-button').addClass('ui-state-disabled');
						$('#red-factory-button').addClass('ui-state-disabled');
						$('#usb-factory-button').removeClass('ui-state-disabled');
					}
					firstFlag = true;
					secondFlag = true;
				}
			});
		} catch (e) {
			console.log(e);
		}
		// var connectMsg = "*Connected";
		// if( theDeviceId > 0 ) {
			// console.log("theDeviceId:"+theDeviceId);
			// connectMsg = connectMsg + ": " + theDeviceId;
		// } else {
			// console.log("no device id");
		// }
		// console.log("setting connectMsg to "+connectMsg);
		// $("#connect-device-msg").text(connectMsg);
		// $("#status-message").text(connectMsg);
		// $('#settings-button').removeClass('ui-state-disabled');
	    	// setTimeout(app.updateGaugeSettings,500);
	    	setTimeout(app.updateGauge,1000);
	    } catch (err ) {
		console.log("lookForDevice() exception:"+err);
		console.log("lookForDevice() Connect your Ketonix!!");
		$("#connect-device-msg").text("Connect your Ketonix");
		if( bluetoothIsOn && noble != null) noble.startScanning(["092cb9a14cbe475e9f56d29404dd29f1"]);
		lookForUsbDevice = true;
	    	setTimeout(app.lookForDevice,5000);
	    }
    }
};
app.initialize();
app.onDeviceReady();
app.lookForDevice();
