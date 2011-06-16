// Make sure the XWiki 'namespace' exist.
if (typeof(XWiki) == "undefined") {
  if (typeof console != "undefined" && typeof console.warn == "function") {
    console.warn("[Auto-suggestion feature] Required class missing: XWiki");
  }
} else {
// Make sure the editors 'namespace' exists.
if (typeof(XWiki.editors) == 'undefined') {
  XWiki.editors = new Object();
}

/**
 * AutoSuggestion feature.
 * TODO Improve i18n support
 */
XWiki.editors.AutoSuggestion = Class.create({
  /** Static values */
  WIKI : "wiki",
  WYSIWYG : "wysiwyg",
  DIV : "div",
  SPAN : "span",
  MASK_CALSSNAME : "suggestion_mask",
  SUGGESTION_TOP_OFFSET : 20,
  SUGGESTION_LEFT_OFFSET : 8,
  SUGGESTION_WIDTH_DEFAULT : 200,
  SUGGESTION_HEIGHT_DEFAULT : 400,
  
  LINK_TRIGGER : "[[",
  IMAGE_TRIGGER : "!!",
  MACRO_TRIGGER : "{{",
  
  /** TextArea object for wiki editor */
  textArea: null,	
  
  /** 
   * The mask dom object that is covered by wiki editor.
   * In order to record the position of the triggers, we duplicated the value in wiki textarea
   * to the mask which is a div and have the same style with the wiki textarea.
   */
  mask : null,
  /** 
   * The dom object of the trigger.
   * We mark the trigger typed in the textarea currently with a span wrapper in the mask, in
   * order to get the cursor dom position for suggestion box.
   * For example, if the value in the textarea is "Hi, my current edit page is [[myPa...1",
   * then the innerHTML of mask will be 
   * "Hi, my current edit page is<span id="suggestion_mask_trigger_link">[[</span>myPa..."
   */ 
  mark : null,
  
  triggerNow : null,
  
  suggestor : null,
  
  /**  
   * Initialization
   * @Param wikiEditorObj, the wiki editor dom object
   */
  initialize : function(wikiEditorObj) {
	this.textArea = wikiEditorObj;	
	this._addMask();
	this.start();
  },
  
  /**  
   * Add the mask to the wiki textarea
   */
  _addMask : function() {
	if (this.mask == null) {
	  this.mask = XWiki.editors.AutoSuggestion.DomUtils.create(this.DIV);
	  Element.extend(this.mask);
	  
	  var info = XWiki.editors.AutoSuggestion.EditorUtils.getEditorPosition(this.textArea);
	  var browserScroll = XWiki.editors.AutoSuggestion.DomUtils.getScrollPos();
	  
	  this.mask.addClassName(this.MASK_CALSSNAME);
	  this.mask.setStyle({
		top: (info.top + browserScroll.top) + "px",
		left: (info.left + browserScroll.left) + "px",
		width: info.width + "px",
		height: info.height + "px"
	  });
	  
	  this.mask.scrollTop = 0;
	  document.body.appendChild(this.mask);
	}
	this.updateMaskPos();
  },
  
  /**  
   * Bind event listeners to text area
   */
  start : function() {
	this.textArea.observe("keyup", this._keyupFn.bind(this));
	this.textArea.observe("keydown", this._keydownFn.bind(this));
	this.textArea.observe("click", this._keyupFn.bind(this));
	this.textArea.observe("blur", this._blurFn.bind(this));
  },
  
  /**  
   * Update the Mask, include position, scrollTop and the styles which should be the same with text area.
   */
  updateMaskPos : function() {
	var textAreaFontFamily = this.textArea.getStyle("font-family");
	var textAreaLineHeight = this.textArea.getStyle("line-height");
	
	var pos = XWiki.editors.AutoSuggestion.EditorUtils.getEditorPosition(this.textArea);
	var browserScroll = XWiki.editors.AutoSuggestion.DomUtils.getScrollPos();
	
	this.mask.setStyle({
	  fontFamily : textAreaFontFamily,
	  lineHeight : textAreaLineHeight,
	  top: (pos.top + browserScroll.top) + "px",
	  left: (pos.left + browserScroll.left) + "px",
	  width: pos.width + "px",
	  height: pos.height + "px"
	});
	
	this.mask.scrollTop = this.textArea.scrollTop;
  },
  
  /** Decide whether current cursor position is in the context of the current suggestor*/
  _decideSuggestorContext : function() {
	var cursorPos = this._getCursorPos();
	if(this.suggestor != null) {
	  if(cursorPos < this.suggestor.getTriggerPosition()){
		// Todo: when the current cursor position is out of context of the current suggestor, 
		// the current suggestor should be destroyed, in order to wait for entering another new
		// suggestor context.
		// this.suggestor.destroy();
		this.suggestor = null;
		return false;
	  }
	}
	return true;
  },
  
  
  _keyupFn : function(event) {
	// Do nothing if current cursor postion is out of the current suggestor context  
	if(!this._decideSuggestorContext()){
	  return;
	}
	// To wait for entering to the specific suggestor context(link/image/macro)
	var cursorPos = this._getCursorPos();
  	var txtValueBeforeAt = this.textArea.value.slice(0,cursorPos);
	var val = txtValueBeforeAt.slice(-2);
	if(val == this.LINK_TRIGGER){
	  this.suggestor = new XWiki.editors.AutoSuggestion.LinkSuggestor(this, cursorPos);
	}
	if(val == this.IMAGE_TRIGGER){
	  this.suggestor = new XWiki.editors.AutoSuggestion.ImageSuggestor(this, cursorPos);
	}
	if(val == this.MACRO_TRIGGER){
	  this.suggestor = new XWiki.editors.AutoSuggestion.MacroSuggestor(this, cursorPos);
	}
	// Handle the keyup event for specific suggestor context
	// For example, in link suggestor, ">>", "attach:", "@", "||" can trigger the suggestion
	// Under Link context, it can be handled by _onKeyup function of the specific suggestor.
	if(this.suggestor) {
	  this.suggestor._onKeyup(event); 
	}
  },
  
  _keydownFn : function(event) {
	if(!this._decideSuggestorContext()){
	  return;
	}
	if(this.suggestor) {
	  this.suggestor. _onKeydown(event); 
	}
  },
  
  _clickFn : function(event) {
	if(!this._decideSuggestorContext()){
	  return;
	}
	if(this.suggestor) {
	  this.suggestor. _onClick(event); 
	}
  },
  
  _blurFn : function(event) {
	//Todo
  },
  
  _getCursorPos : function() {
	return XWiki.editors.AutoSuggestion.EditorUtils.getCursorPosition(this.textArea);
  }
});
										
XWiki.editors.AutoSuggestion.Suggestor = Class.create({		
  /** 
   * The suggestion box for link/image/macro suggestion results
   * For link, the suggestionBox should be XWiki.editors.AutoSuggestion.LinkSuggestionList
   * For image, the suggestionBox should be XWiki.editors.AutoSuggestion.ImageSuggestionList
   * For macro, the suggestionBox should be XWiki.editors.AutoSuggestion.MacroSuggestionList
   */
  suggestionBox : null,
  /** The AutoSuggestion object which invoke the suggestor object */
  client : null,
  /** The current context of suggestor */
  state : null,
  
  initialize : function(client) {
	this.client = client;
  },
  
  /**  
   * Give suggestion results.
   */
  suggest : function() {
	//to overwrite
  },
  
  /** Keyup handler*/
  _onKeyup : function(event) {
	this.suggest();
  },
  
  /** Keydown handler*/
  _onKeydown : function(event) {
    //To overwrite
  },
  
  /** Click handler*/
  _onClick : function(event) {
	//To overwrite
  },
  
   /** Blur handler*/
  _onBlur : function(event) {
	//To overwrite
  },
  
  /**  
   * Determin whether the trigger is triggered.
   * @param trigger The trigger name.
   */
  _isTrigger : function(trigger) {
    var cursorPos = this.client._getCursorPos();
  	var txtValueBeforeAt = this.client.textArea.value.slice(0,cursorPos);
	var val = txtValueBeforeAt.slice(-trigger.length);
	if(val == trigger){
		return true;
	}
	return false;
  },
  
  /**  
   * Show the suggestion box of related suggestors.
   */
  showSuggestion : function() {
	var markPos = this.mark.getBoundingClientRect();
	var browserScroll = XWiki.editors.AutoSuggestion.DomUtils.getScrollPos();
	//suggestio box position, actually it is the mask position position which is represent the position of trigger.
	var position = {"top" : markPos.top + this.client.SUGGESTION_TOP_OFFSET + browserScroll.top, "left" : markPos.left + this.client.SUGGESTION_LEFT_OFFSET};
    //suggestion box default size
	var size = {"width" :this.client.SUGGESTION_WIDTH_DEFAULT, "height" : this.client.SUGGESTION_HEIGHT_DEFAULT};
	
	this._showSuggestionBox();
  },
  
  /**  
   * To show the suggestion list specific to the different type of suggestions(link/image/macro).
   */
  _showSuggestionBox : function() {
	// To overwrite
  }
});
										
XWiki.editors.AutoSuggestion.LinkSuggestor = Class.create(XWiki.editors.AutoSuggestion.Suggestor, {	  
  markTrigger : {trigger:"[[", pos:-1},
  markLabel : {trigger:">>", pos:-1},
  markAttach : {trigger:"attach:", pos:-1},
  markAttachAt :{trigger:"@", pos:-1},
  markAttribute :{trigger:"||", pos:-1},
  
  initialize : function(client, triggerPos) {
	this.client = client; 
	this.markTrigger.pos = triggerPos;
	this.state = this.markTrigger;
  },
  
  /**  
   * See @XWiki.editors.AutoSuggestion.Suggestor
   */
  suggest : function() {
    switch(this.state.trigger) {
	  case this.markTrigger.trigger:
		this.actionTriggered();
		break;
	  case this.markLabel.trigger:
		this.actionLabel();
		break;
	  case this.markAttach.trigger:
		this.actionAttach();
		break;
	  case this.markAttachAt.trigger:
		this.actionAttachAt();
		break;
	  case this.markAttribute.trigger:
		this.actionAttribute();
		break;
	}
  },
  
  /**  
   * Get the position of link trigger "[["
   */
  getTriggerPosition : function() {
	return this.markTrigger.pos;
  },
  
  /**  
   * Suggest after "[[" is triggered, and still in the context of "[[" trigger.
   */
  actionTriggered : function() {
    var currentPos = this.client._getCursorPos();	
    this._updateMaskContent(this.markTrigger);
	
	var query = this.client.textArea.value.substring(this.markTrigger.pos, currentPos);
	this.searchQuery(query)
    
	// Prepare to enter another link triggers can be used after "[[" trigger.
	if(this._isTrigger(this.markLabel.trigger)) {
	  this.markLabel.pos = this.client._getCursorPos();
	  this.state = this.markLabel;
	  this.triggerLink.push(this.markLabel);
	}
	
	if(this._isTrigger(this.markAttach.trigger)) {
	  this.markAttach.pos = this.client._getCursorPos();
      this.state = this.markAttach;
	  this.triggerLink.push(this.markAttach);
	}
	
	if(this._isTrigger(this.markAttribute.trigger)) {
	  this.markAttribute.pos = this.client._getCursorPos();
	  this.state = this.markAttribute;
	  this.triggerLink.push(this.markAttribute);
	}
  },
  
  /**  
   * Suggest after ">>" is triggered, and still in the context of ">>" trigger.
   */
  actionLabel : function() {
	// Todo: Prepare to enter another link triggers can be used after ">>" trigger.
  },
  
  actionAttach : function() {
	// Todo: Prepare to enter another link triggers can be used after "attach:" trigger.
  },
  
  actionAttachAt : function() {
	// Todo: Prepare to enter another link triggers can be used after "@" trigger.
  },
  
  actionAttribute : function() {
	// Todo: Prepare to enter another link triggers can be used after "||" trigger.
  },
  
  _onKeydown : function(event) {
    // Todo
  },
  
  _onClick : function(event) {
	// Todo
  },
  
  // Update Mask with the current trigger mark, it holds the position for suggestion box.
  _updateMaskContent : function(trigger) {
	var html = "";
	html += this.client.textArea.value.slice(0, trigger.pos-trigger.trigger.length).replace(/\n/g, '<br/>').replace(/\s/g, '&nbsp;');
	html += "<span id='suggest_mark'>"+trigger.trigger+"</span>"
	html += this.client.textArea.value.slice(trigger.pos, this.client.textArea.value.length).replace(/\n/g, '<br/>').replace(/\s/g, '&nbsp;');
	this.client.mask.update(html);
  },
  
  _showSuggestionBox : function() {
	//Todo
  }
});


XWiki.editors.AutoSuggestion.ImageSuggestor = Class.create(XWiki.editors.AutoSuggestion.Suggestor, {		
});

XWiki.editors.AutoSuggestion.MacroSuggestor = Class.create(XWiki.editors.AutoSuggestion.Suggestor, {		
});

/**
 * The abstract suggestion box for showing the result given by suggestors.
 */
XWiki.editors.AutoSuggestion.SuggestionList = Class.create({
  /** The position of suggestion box*/
  position : null,
  /** The default size of suggestion box*/
  size : {"width":200, "height":400},
  title : "",
  /** {"type:"wiki/wysiwyg, "obj":editorObj} */
  editor : null, 
  /** The index of selected suggestion item*/
  index : -1,
  
  /** The html content of the suggestion box*/
  containerHtmlTemplate : '<div id="suggestion_box_container">'
  +'<div class="shadow1">'
  +'<div class="shadow2">'
  +'<div class="shadow3">'
  	+'<div id="suggestion_box" class="container">'
	  +'<div id="suggestion_title"></div>'
	  +'<div id="suggestion_resultList"></div>'
	  +'<div id="suggestion_toolbar"></div>'
	+'</div>'
  +'</div>'
  +'</div>'
  +'</div>'
  +'</div>',

  initialize : function(position, size, editor) {
	if(editor == null){
	  return;
	}
	this.editor = editor;
    var container = XWiki.editors.AutoSuggestion.DomUtils.create("div");
	Element.extend(container);
	container.insert(this.containerHtmlTemplate);
	document.body.appendChild(container);
	if(this.editor.type == "wiki") {
	  $("suggestion_toolbar").hide();
	}
	this.updatePosition(position, size);
  },
  
  /**
   * Update the position of the suggestion box.
   */
  updatePosition : function(position, size) {
	if(position == null) return;
	if(size == null) size = this.size;
	this.size = size;
	this.posistion = position;
	$("suggestion_box_container").setStyle({
	  "top": position.top + "px",
	  "left": position.left + "px",
	  "width": size.width + "px",
	  "height": size.height + "px"
	});
  },
  
  /**
   * Show the suggestion result in the suggestion box.
   */
  showSuggestion : function(position, size) {
	//To overwirte
  },
  
  isTriggered : function() {
	return $("suggestion_box_container").style.display == "none" ? false : true;
  },
  
  hide : function() {
	$("suggestion_box_container").hide();
  },
  
  show : function() {
	this._bindSuggestionBoxEvents();
	//this.bindMouseWheelNavigation();
	$("suggestion_box_container").show();
  },
  
  /**
   * Handler for clicking the suggestion result item.
   */
  onItemClick : function(index, itemList, event) {
	  this.itemClickHandler(index, itemList);
	  //Focus on the editor in order to listen to the event specific to editor
	  //like key navigation
	  this.editor.obj.focus();
	  itemList[index].addClassName("xListItem-selected");
  },
  /**
   * Handler for double clicking the suggestion result item.
   */
  onItemDbClick : function(index, itemList, event) {
	  this.itemDbClickHandler(index, itemList);
  },
  
  /**
   * Handler for selecting suggestion result item by up and down keys.
   */
  onKeyNavigate : function(itemList, event) {
	  var keyCode = event.keyCode;
	  if(!this.isTriggered()) {
		  return true;
	  }
	  var i = this.index;
	  switch(keyCode){
		case 40:
		  i = i + 1;
		  break;
		case 38:
		  i = i - 1;
		  break;
		case 13:
		  return this.selectItem();
		  break;
		default:
		  return true;
	  }
	  console.debug(i);
	  i = i >= itemList.length ? 0 : i< 0 ? itemList.length-1 : i;
	  return this.keyNavigateHandler(i, itemList);
  },
  
  /**
   * Bind the events to suggestion box.
   */
  _bindSuggestionBoxEvents : function() {
	//To overwrite
  }
});

XWiki.editors.AutoSuggestion.LinkSuggestionBox = Class.create(XWiki.editors.AutoSuggestion.SuggestionList,{
  title : "Link Suggestions:",
  /** Suggestion result for pages. */
  pageItemValues : new Array(),
  
  /** Suggestion result for attachments. */
  attachmentItemValues : new Array(),
  
  /**
   * The html for showing the suggestion result list for link.
   */
  linkHtmlTemplate : '<div id="suggestion_wikipage">'
  +'</div>'
  +'<div id="suggestion_attachment">'
  +'</div>',
 
  initialize : function($super, pages, attachments, position, size, editor) {
    $super(position, size, editor);
	this.pageItemValues = pages;
	this.attachmentItemValues = attachments;
	$("suggestion_resultList").insert(this.linkHtmlTemplate);
  },
  
  showSuggestions : function(position, size) {
	this.clearSuggestion();
	this.updatePosition(position, size);
	this._showPageSuggestions(this.pageItemValues);
	this._showAttachmentSuggestions(this.attachmentItemValues);
	this.show();
  },
  
  clearSuggestion : function() {
	$("suggestion_wikipage").update("");
	$("suggestion_attachment").update("");
  },
  
  _showPageSuggestions : function(pages) {
	  var pageContainer = $("suggestion_wikipage");
	  var thisObj =  this;
	  pages.each(function(obj, index) {
		//console.debug(obj);
		var pageDiv = XWiki.editors.AutoSuggestion.DomUtils.create("div"); 
		Element.extend(pageDiv);
		pageDiv.addClassName("xPagePreview");
		//pageDiv.writeAttribute("title='hello'");
		
		var titleDiv = XWiki.editors.AutoSuggestion.DomUtils.create("div"); 
		Element.extend(titleDiv);
		titleDiv.addClassName("xPagePreviewTitle");
		titleDiv.insert(obj);
		
		var fullNameDiv = XWiki.editors.AutoSuggestion.DomUtils.create("div"); 
		Element.extend(fullNameDiv);
		fullNameDiv.addClassName("xPagePreviewFullname");
		fullNameDiv.insert(index+"."+obj);
		
		pageDiv.appendChild(titleDiv);
		pageDiv.appendChild(fullNameDiv);
		pageContainer.appendChild(pageDiv);
		pageContainer.scrollTop = 0;
	  })
  },
  
  _showAttachmentSuggestions : function(attachments) {
	var attachmentContaier = $("suggestion_attachment");
	var thisObj =  this;
	attachments.each(function(obj, index) {
	  var attachmentDiv = XWiki.editors.AutoSuggestion.DomUtils.create("div"); 
	  Element.extend(attachmentDiv);
	  attachmentDiv.addClassName("xListItem");
		
	  var titleDiv = XWiki.editors.AutoSuggestion.DomUtils.create("div"); 
	  Element.extend(titleDiv);
	  titleDiv.addClassName("xAttachPreview");
	  titleDiv.insert(obj);
	  
      attachmentDiv.appendChild(titleDiv);		
	  attachmentContaier.appendChild(attachmentDiv);
	  attachmentContaier.scrollTop = 0;
	  })
  },  
  
  itemClickHandler : function(index, itemList) {
	this.index = index;
	itemList.each(function(obj) {
	  obj.removeClassName("xListItem-selected")
	});
  },
  
  itemDbClickHandler : function(index, itemList) {
	this.index = index;
	var results = this.pageItemValues.concat(this.attachmentItemValues);
	console.debug(results[index])
	this.hide();
  },
  
  keyNavigateHandler : function(index, itemList) {
	var scrollTop = $("suggestion_wikipage").scrollTop;
	
	var pageContainerHeight = $("suggestion_wikipage").getHeight();
	var attachmentContainerHeight = $("suggestion_attachment").getHeight();
	
	var selectedItem = itemList[index];
	var selectedItemLayout = selectedItem.getLayout();
	var relativeTop = selectedItemLayout.get('top');
	
	if(index<this.pageItemValues.length) {
	  if(relativeTop <= scrollTop) {
		$("suggestion_wikipage").scrollTop -= scrollTop - relativeTop;
	  }
	  if(relativeTop >=pageContainerHeight+scrollTop) {
		$("suggestion_wikipage").scrollTop += relativeTop - (pageContainerHeight+scrollTop) + selectedItem.getHeight();
	  }
	}
	
	if(this.index >= 0) {
	  itemList[this.index].removeClassName("xListItem-selected");
	}
	itemList[index].addClassName("xListItem-selected");
	this.index = index;
	return false;
  },
  
  _bindSuggestionBoxEvents : function() {
	var thisObj = this;
	var pageItemList = $$("#suggestion_wikipage div.xPagePreview");
	var attachmentItemList = $$("#suggestion_attachment div.xListItem");
	var itemList = pageItemList.concat(attachmentItemList);
	this.editor.obj.stopObserving('keydown');
	this.editor.obj.observe("keydown", this.onKeyNavigate.bind(this, itemList));
	//Listen to the click and dbclick events;
	itemList.each(function(aitem, index) {
	  aitem.stopObserving('click');
	  aitem.stopObserving('dblclick');
	  aitem.observe("click", thisObj.onItemClick.bind(thisObj, index, itemList));
	  aitem.observe("dblclick", thisObj.onItemDbClick.bind(thisObj, index, itemList));
	});
	
  },
  
  selectIndex : function(index, container) {
	if(container.id == "suggestion_wikipage") {
	  this.pageListIndex = index;
	} else if(container.id == "suggestion_attachment") {
	  this.attachmentListIndex = index;
	}
  },
  
  getSelectedItemValue : function(list, index) {
	  return list[index];
  }
});

XWiki.editors.AutoSuggestion.ImageSuggestionBox = Class.create(XWiki.editors.AutoSuggestion.SuggestionList, {
  /** Initialization */
  initialize : function() {
    
  }
});

XWiki.editors.AutoSuggestion.MacroSuggestionBox = Class.create(XWiki.editors.AutoSuggestion.SuggestionList, {
  /** Initialization */
  initialize : function() {
    
  }
});

/** Static Utilities */
XWiki.editors.AutoSuggestion.DomUtils = {
  create : function(name) {
	return document.createElement(name);
  },
  
  getScrollPos : function(){
	var top = document.documentElement.scrollTop || document.body.scrollTop; 
	var left = document.documentElement.scrollLeft || document.body.scrollLeft;
	return {"top":top, "left":left};
  }
};

XWiki.editors.AutoSuggestion.EditorUtils = {
  getEditorPosition : function(editor){
	var o = editor.getBoundingClientRect();
	var w = editor.offsetWidth;
	var h = editor.offsetHeight;
	return {"top":o.top, "left":o.left, "width":w, "height":h};
  },
  
  getCursorPosition : function(editor) {
	if(document.selection){
	  editor.focus();
	  var ds = document.selection;
	  var range = null;
	  range = ds.createRange();
	  var storedRange = range.duplicate();
	  storedRange.moveToElementText(editor);
	  storedRange.setEndPoint("EndToEnd", range);
	  editor.selectionStart = storedRange.text.length - range.text.length;
	  editor.selectionEnd = editor.selectionStart + range.text.length;
	  return editor.selectionStart;
	}else{
	  return editor.selectionStart;
	}
  },
  
  setCursorPosition : function(editor, position) {
	var n = position == "end"? editor.value.length : position;
	if(document.selection){
		var range = t.createTextRange();
		range.moveEnd("character", -editor.value.length);
		range.moveEnd("character", n);
		range.moveStart("character", n);
		range.select();
	}else{
		editor.setSelectionRange(n, n);
		editor.focus();
	}
  },
  
  addText : function(editor,txt) {
	var val = editor.value;
	if(document.selection){
	  document.selection.createRange().text = txt;
	} else {
	  var cp = editor.selectionStart;
	  var ubbLength = editor.value.length;
	  editor.value = editor.value.slice(0,editor.selectionStart) + txt + editor.value.slice(editor.selectionStart, ubbLength);
	  this.setCursorPosition(editor, cp + txt.length);
	}
  }
};

// When the document is loaded, create the AutoSuggestion control
document.observe("xwiki:dom:loaded", function() {
  new XWiki.editors.AutoSuggestion($("content"));
});
}

