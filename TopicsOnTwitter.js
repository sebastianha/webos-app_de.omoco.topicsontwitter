enyo.kind({
	name: "enyo.Canon.TopicsOnTwitter",
	kind: enyo.VFlexBox,
	components: [
		{kind: "AppMenu", components: [
			{kind: "EditMenu"},
			{caption: "About", onclick: "showAbout"}
		]},
		{kind: "ModalDialog", name: "aboutPopup", components:[
			{content: "<center><b>Topics on Twitter</b><br><br>An App by<br>Sebastian Hammerl<br><br><a href='mailto:topicsontwitter@omoco.de'>topicsontwitter@omoco.de</a><br><br><a href='http://omoco.de'>http://omoco.de</a><br><br></center>"},
			{kind: "Button", caption: "Close", onclick: "closeAbout", style: "margin-top:10px"},
		]},
		{kind: "ModalDialog", name: "errorPopup", caption: "Error", components:[
			{content: "<center>Something went wrong with the request.<br>Please try to select other topics to display.</center>", className: "enyo-text-error warning-icon"},
			{kind: "Button", caption: "Close", onclick: "closeError", style: "margin-top:10px"},
		]},
		{kind: "Scrim", layoutKind: "VFlexLayout", align: "center", pack: "center", components: [
			{kind: "SpinnerLarge"},
			{style: "color:white", content: "<h2>Connecting to Twitter...</h2>"}
		]},
		{kind: "DbService", dbKind: "enyo.topicsontwitter:1", onFailure: "dbFailure", components: [
			{name: "delDbKind", method: "delKind", onResponse: "delDbKindResponse"},
			{name: "makeDbKind", method: "putKind", onSuccess: "makeDbKindSuccess"},
			{name: "insert", method: "put", onResponse: "insertResponse"},
			{name: "find", method: "find", onResponse: "findResponse"}
		]},
		{kind: "VFlexBox", className: "enyo-fit", components: [
			{name: "tmpheader", kind: "Header"},
			{kind: "Spacer"},
			{kind: "Toolbar", components: [
				{caption: " "}
			]}
		]},
		{name: "slidingPane", kind: "SlidingPane", flex: 1, components: [
			{name: "left", width: "320px", components: [
				{name: "header", kind: "Header", content: "Topics on Twitter"},
				{className: "enyoRow", components: [
					{kind: "ToolInput", name: "input", hint: " Enter Topic...", value: "", components: [
						{kind: "Button", caption: "Add", onclick: "buttonClick"}
					]}
				]},
				{name: "getTrends", kind: "WebService", onSuccess: "gotTrends", onFailure: "gotTrendsFailure"},
				{name: "getTopics", kind: "WebService", onSuccess: "getTopicsSuccess", onFailure: "getTopicsFailure"},
				{kind: "Scroller", flex: 1, components: [
					{kind: "VirtualList", name: "list", onSetupRow: "listSetupRow", components: [
						{kind: "Divider"},
						{kind: "Item", tapHighlight: true, name: "item", layoutKind: "HFlexLayout", onclick: "rowClick", components: [
							{name: "caption", flex: 1},
							{kind: "CheckBox", name: "checkbox", onChange: "rowChange"},
						]}
					]},
				]},
				{kind: "Toolbar", components: [
					{caption: "Clear All", onclick: "clearAll"},
					{caption: "Fullscreen", onclick: "fullscreen"}
				]}
			]},
			{name: "right", flex: 1, onResize: "slidingResize", components: [
				{name: "topicsHeader", kind: "Header", content: "Live on Twitter..."},
				{name: "pauseHeader", style: "background-color:red", content: "<center>Paused - Scroll to Top to Resume</center>"},
				{kind: "Scroller", name: "topicsScroller", onScrollStop: "onScrollTopics", autoHorizontal: false, horizontal: false, flex: 1, components: [
					{name: "topics", allowHtml: true}
				]},
				{kind: "Toolbar", components: [
					{kind: "GrabButton"},
					{caption: "Clear All", onclick: "clearTopics"}
				]}
			]}
		]}
	],

	create: function() {
		this.inherited(arguments);

		enyo.windows.setWindowProperties(window, {blockScreenTimeout: true});
		
		this.pause = false;
		this.lastIds = new Array();
		this.lastRequest = "";
		this.counter = 0;
		this.topicsUrl = "http://search.twitter.com/search.json?rpp=10&q=";
		this.trendsUrl = "http://api.twitter.com/1/trends.json";
		
		this.maxVisibleDivs = 100;
		this.maxSavedTopics = 8;
		this.topicsRateSeconds = 2;
		
		this.$.spinnerLarge.show();
		this.$.scrim.show();
		
		this.$.pauseHeader.hide();

		this.data = [
			{subject: "twitter", type: "saved", checked: true},
			{subject: "webos", type: "saved", checked: false},
			{subject: "palm", type: "saved", checked: false},
			{subject: "hp", type: "saved", checked: false},
		];
		
		this.$.find.call();

		this.insertTweet();
	},
	
	openAppMenuHandler: function() {
		this.$.appMenu.open();
	},
	closeAppMenuHandler: function() {
		this.$.appMenu.close();
	},
	showAbout: function() {
		 this.$.aboutPopup.openAtCenter();
	},
	closeAbout: function() {
		 this.$.aboutPopup.close();
	},

	dbFailure: function(inSender, inError, inRequest) {
		console.log(enyo.json.stringify(inError));
	},
	delDbKindResponse: function() {
		console.log("delDbKindResponse");
		this.$.makeDbKind.call({owner: enyo.fetchAppId()});
	},
	formatTmpData: function(tmpData) {
		var a = [];
		var dbKind = this.$.dbService.dbKind;
		for (var i=0, f; f=tmpData[i]; i++) {
			a.push({_kind: dbKind, subject: f.subject, type:f.type, checked:f.checked});
		}
		return a;
	},
	makeDbKindSuccess: function() {
		console.log("makeDbKindResponse");
		var tmpData = []
		for(var i=0; i< this.data.length; i++) {
			if(this.data[i].type == "saved" && tmpData.length < this.maxSavedTopics) {
				tmpData.push(this.data[i]);
			}
		}
		
		for(var i=0; i<tmpData.length; i++) {
			console.log(tmpData[i].subject);
		}
		
		this.$.insert.call({objects: this.formatTmpData(tmpData)});
	},
	insertResponse: function() {
		console.log("insertResponse");
	},
	findResponse: function(inSender, inResponse, inRequest) {
		if(!inResponse.results) {
			this.$.delDbKind.call();
		}
		
		if(inResponse.results) {
			this.data = []
			
			for(var i=0; i < inResponse.results.length; i++) {
				console.log(inResponse.results[i].subject);
				this.data.push(inResponse.results[i]);
			}
		}
		
		var nothingchecked = true;
		for(var i = 0; i < this.data.length; i++) {
			if(this.data[i].checked)
				nothingchecked = false;
		}
		if(nothingchecked)
			this.data[0].checked = true;
		
		this.$.list.refresh();
		
		this.$.getTrends.setUrl(this.trendsUrl);
		this.$.getTrends.call();
	},

	onScrollTopics: function() {
		if(this.$.topicsScroller.getScrollTop() == 0) {
			this.pause = false;
			this.$.pauseHeader.hide();
		} else {
			this.pause = true;
			this.$.pauseHeader.show();
		}
	},
	buttonClick: function(inSender, inEvent) {
		var alreadyExists = false;
		
		for(var i = 0; i < this.data.length; i++) {
			if(this.data[i].subject == this.$.input.value)
				alreadyExists = true;
		}

		if(this.$.input.value != "" && !alreadyExists) {
			this.data.unshift({subject: this.$.input.value,  type: "saved", checked: true});
			
			this.$.delDbKind.call();
		}
		
		this.$.input.setValue("");
		this.$.list.refresh();
		
		this.submitRequest();
	},
	rowClick: function(inSender, inEvent) {
		this.$.checkbox.setChecked(this.$.checkbox.getChecked() ? false : true);
		this.data[inEvent.rowIndex].checked = this.$.checkbox.getChecked();
		
		if(this.$.checkbox.getChecked()) {
			var tmpItem = this.data[inEvent.rowIndex];
			tmpItem.type = "saved";
			this.data.splice(inEvent.rowIndex, 1);
			this.data.unshift(tmpItem);
			this.$.list.refresh();
		}
		
		this.$.delDbKind.call();
		
		this.submitRequest();
	},
	rowChange: function(inSender) {
		this.$.checkbox.setChecked(this.$.checkbox.getChecked() ? false : true);
	},
	getGroupName: function(inIndex) {
		if(inIndex == 0)
			return "History";
		else if(this.data[inIndex-1].type == "saved" && this.data[inIndex].type == "trending")
			return "Trending Topics";
		else
			return null;
	},
	setupDivider: function(inIndex) {
		var group = this.getGroupName(inIndex);
		this.$.divider.setCaption(group);
		this.$.divider.canGenerate = Boolean(group);
		this.$.item.applyStyle("border-top", Boolean(group) ? "none" : "");
	},
	listSetupRow: function(inSender, inIndex) {
		var record = this.data[inIndex];
		if (record) {
			this.setupDivider(inIndex);
			
			this.$.caption.setContent(record.subject);
			this.$.checkbox.setChecked(record.checked);
			return true;
		}
	},
	
	fullscreen: function() {
		this.submitRequest();
		this.$.slidingPane.selectView(this.$.right);
	},
	submitRequest: function() {
		var searchFor = "";
		for(var i=0; i<this.data.length; i++) {
			if(this.data[i].checked == true) {
				searchFor = searchFor + this.data[i].subject + " OR "
			}
		}
		
		searchFor = searchFor.substring(0,searchFor.length-3);

		console.log("SEARCHFOR: " + searchFor);
		
		if(searchFor != null && searchFor != "") {
			console.log("not empty");
			this.$.getTopics.setUrl(this.topicsUrl + escape(searchFor));
			this.$.getTopics.call();
		}
		
		this.$.topicsHeader.setContent("Live on Twitter: " + searchFor.split(" OR ").join(", "));
	},
	clearAll: function() {
		for(var i=0; i < this.data.length; i++) {
			this.data[i].checked = false;
		}
		
		this.$.list.refresh();
		
		this.$.delDbKind.call();
		
		this.submitRequest();
	},
	goBack: function() {
		this.$.slidingPane.selectView(this.$.left);
	},
	clearTopics: function() {
		this.$.topics.setContent("");
		
		this.pause = false;
		this.$.pauseHeader.hide();
		
		this.$.topicsScroller.scrollTo(0,0);
	},
	
	gotTrends: function(inSender, inResponse) {
		for(var i = 0; i < inResponse.trends.length; i++) {
			this.data.push({subject: inResponse.trends[i].name, type: "trending", checked: false});
		}

		this.$.list.refresh();
		
		this.submitRequest();
	},
	gotTrendsFailure: function(inSender, inResponse) {
		this.$.list.refresh();
		
		this.submitRequest();
	},
	getTopicsSuccess: function(inSender, inResponse) {
		this.$.spinnerLarge.hide();
		this.$.scrim.hide();
		
		var tmpContent = this.$.topics.content;
		tmpContent = tmpContent.split("</div>");
		var tmpContent2 = "";
		var numberOfDivs = tmpContent.length-1;
		if(numberOfDivs > this.maxVisibleDivs)
			numberOfDivs = this.maxVisibleDivs;
		for(var i = 0; i <= numberOfDivs; i++) {
			tmpContent2 += tmpContent[i] + "</div>";
		}
		this.$.topics.setContent(tmpContent2);
		
		this.lastRequest = inResponse.results;
	},
	getTopicsFailure: function(inSender, inResponse) {
		this.$.spinnerLarge.hide();
		this.$.scrim.hide();
		
		this.$.errorPopup.openAtCenter();
	},
	closeError: function() {
		this.clearAll();
		this.$.errorPopup.close();
	},
	insertTweet: function() {
		if(!this.pause) {
			for(var i=(this.lastRequest.length-1); i>=0; i--) {
				var found = false;
				for(var ii=0; ii<this.lastIds.length; ii++)
					if(this.lastIds[ii] == this.lastRequest[i].id)
						found = true;
				
				if(!found) {
					this.insertNew(this.lastRequest[i].from_user, this.lastRequest[i].profile_image_url, null, this.lastRequest[i].text, this.lastRequest[i].id);
					
					this.lastIds.push(this.lastRequest[i].id);
					if(this.lastIds.length > this.maxVisibleDivs)
						this.lastIds.splice(0,1);
					break;
				}
			}
			
			this.counter ++;
			
			if(this.counter > 7) {
				this.counter = 0;
				//enyo.job(false, enyo.bind(this, this.$.getTopics.call()), 1000);
				enyo.job(false, enyo.bind(this, this.submitRequest()), 1000);
			}
		}
			
		enyo.job(false, enyo.bind(this, this.insertTweet), (this.topicsRateSeconds * 1000));
	},
	autolink: function(s) {   
		var hlink = /\s(ht|f)tp:\/\/([^ \,\;\:\!\)\(\"\'\<\>\f\n\r\t\v])+/g;
		return (s.replace (hlink, function ($0,$1,$2) {
			s = $0.substring(1,$0.length); 
			while (s.length>0 && s.charAt(s.length-1)=='.') 
				s=s.substring(0,s.length-1);
			return " " + s.link(s); 
		}));
	},
	insertNew: function(fromUser, profileImage, createdAt, text, id) {
		this.$.topics.setContent("<div style='border-top: solid 1px #eaeaea;border-bottom: solid 1px #acacac;min-height:70px;width:100%;'>" +
			"<table border=0 cellspacing=4 cellpadding=0>" +
				"<tr>" +
					"<td valign=top width=70 height=70 style='background-image:url(images/shadow.png);background-repeat:no-repeat'>" +
						"<a href='http://twitter.com/" + fromUser + "'><img height=64 width=64 src='" + profileImage + "'></a>" +
					"</td>" +
					"<td valign=top style='word-wrap: break-word;'>" +
						"<b>" + fromUser + "</b> " + this.autolink(text) +
					"</td>" +
				"</tr>" +
			"</table>" +
		"</div>" + this.$.topics.content);
	}
});