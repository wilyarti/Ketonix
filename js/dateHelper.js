/**
 * A very simple class for some basic Date operations
 * @author Felipe Lavín <www.yukei.net>
 */
var dateHelper = {
	arrToDate : function(arr, format){
		/**
		 * Convert an array to a Date object
		 * @argument arr {Array} An array containing at least day-month-year
		 * @argument format {String} An string representation of the date format. Default: dd-mm-yyyy. More could be added as necessary
		 * @returns {Date} A date object
		 */
		switch(format){
			case 'mm-dd-yyyy' :
				var out = new Date(arr[2], arr[0] - 1, arr[1]);
				break;
			case 'yyyy-mm-dd' :
				var out = new Date(arr[0], arr[1] - 1, arr[2]);
				break;
			default : //dd-mm-yyyy
				var out = new Date(arr[2], arr[1] - 1, arr[0]);
				break;
		}
		return out;
	},
	dateToStr : function(dateObj, format, separator){
		/**
		 * Convert a date object to a string
		 * @argument dateObj {Date} A date object
		 * @argument format {string} An string representation of the date format. Default: dd-mm-yyyy. More could be added as necessary
		 * @argument separator {string} Character used for join the parts of the date
		 * @returns {string} An string representation of a Date
		 */
		var year = dateObj.getFullYear().toString();
		var month = dateObj.getMonth() + 1;
		var month = ( month < 10 ) ? '0'+month : month;
		var day = dateObj.getDate();
		var day = ( day < 10 ) ? '0'+day : day;
		var sep = ( separator ) ? separator : '-';
		switch(format){
			case 'mm-dd-yyy' :
				var out = [month, day, year];
				break;
			case 'yyyy-mm-dd' :
				var out = [year, month, day];
				break;
			default : //dd-mm-yyy
				var out = [day, month, year];
		}
		return out.join(sep);
	},
	addDays : function(dateObj, days){
		/**
		 * Add a number of days to a given Date
		 * @argument dateObj {Date} A Date object
		 * @argument days {Number} The number of days to be added
		 * @returns {Date} A new Date object, with the days added
		 */
		var dateVal = dateObj.valueOf();
		return new Date( parseInt(dateVal + ( days * 86400000 ) ) );
	},
	reformatArr : function(dateIn, formatIn, formatOut, separator){
		/**
		 * Takes an array with date information and display it on as a string in a different format
		 * @argument dateIn {array} An array with the date information
		 * @argument formatIn {string} The format for the input date array
		 * @argument formatOut {string} The format for the date string output
		 * @argument separator {string} Character used as separator
		 * @returns {string} Formatted date string
		 */
		if ( !formatIn ) formatIn = 'yyyy-mm-dd';
		if ( !formatOut ) formatOut = 'dd-mm-yyyy';
		if ( !separator ) separator = '/';
		var orDate = this.arrToDate(dateIn, formatIn);
		return this.dateToStr(orDate, formatOut, separator);
	}
}