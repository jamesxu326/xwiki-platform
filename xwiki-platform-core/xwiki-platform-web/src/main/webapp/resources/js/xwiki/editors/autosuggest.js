// ======================================
// Auto Suggestion for wiki editors
// 
var XWiki = (function (XWiki) {
// Start XWiki augmentation.
var autosuggestion = XWiki.autosuggestion = XWiki.autosuggestion || {};

var EVENTKEYS = {
  KEY_PRINT: 42,
  KEY_PAUSE: 19,
  KEY_NUMLOCK: 136,
  KEY_TAB: 9,
  KEY_CAPSLOCK: 20,
  KEY_SHIFT: 16,
  KEY_ALT: 18,
  KEY_CONTROL: 17,
  KEY_F1: 112,
  KEY_F2: 113,
  KEY_F3: 114,
  KEY_F4: 115,
  KEY_F5: 116,
  KEY_F6: 117,
  KEY_F7: 118,
  KEY_F8: 119,
  KEY_F9: 120,
  KEY_F10: 121,
  KEY_F11: 122,
  KEY_F12: 123
}
/**
 * The abstract object for suggestor of wiki editors
 */
autosuggestion.Suggestor = Class.create({
  /** The @autosuggestion.WikiEditor object */
  editor : null,
  /** The current trigger which is in its context */
  currentTrigger : null,
  /** The suggestion box for showing the suggestion results */
  suggestionBox : null,
  /** Record the mouse position*/
  mousePos : null,

  /**
   * Initialization: Bind the textarea of the wiki editor
   * to @autosuggestion.WikiEditor object.
   */
  initialize : function(editor) {
    if(editor ==  null) {
      return;
    }
    this.editor = new autosuggestion.WikiEditor(editor);
    this.editor.addMask();
  },
  
  /**
   * Start boot for suggestors; including:
   * a) Bind the events to the wiki editor to listen to the user inputs
   */
  start : function () {
    if(this.editor == null) return;
    this.bindEvents();
  },
  
  /**
   * Destroy the suggestors; including:
   * a) Destroy the suggestion box if it exists;
   * b) Set the currentTrigger to be null;
   */
  destroy : function() {
   // this.unBindEvents();
    if(this.suggestionBox != null && !this.suggestionBox.isDestroyed()) {
      this.suggestionBox.destroy();
    }
    this.currentTrigger = null;
    //this.editor = null;
  },

  bindEvents : function() {
    // In order to unbind the specific event.
    // see http://api.prototypejs.org/dom/Event/stopObserving/
    this.onKeyupAvatar = this.onKeyup.bind(this);
    this.editor.getTextArea().observe("keyup", this.onKeyupAvatar);
    this.onClickAvatar = this.onClick.bind(this);
    this.editor.getTextArea().observe("click", this.onClickAvatar);
    this.onBlurAvatar = this.onBlur.bind(this);
    this.editor.getTextArea().observe("blur", this.onBlurAvatar);
    // Listen to the itemSelected event when user select one item from the suggestion box.
    this.onItemSelectedAvatar = this.onItemSelected.bind(this);
    document.observe("xwiki:autosuggestion:itemSelected", this.onItemSelectedAvatar);
  },

  unBindEvents : function() {
    this.editor.getTextArea().stopObserving("keyup", this.onKeyupAvatar);
    this.editor.getTextArea().stopObserving("click", this.onClickAvatar);
    this.editor.getTextArea().stopObserving("blur", this.onBlurAvatar);
    document.stopObserving("xwiki:autosuggestion:itemSelcted", this.onItemSelectedAvatar);
  },
 
  /**
   * If click on the editor, the suggestor will be destroyed
   * if it exists.
   */ 
  onClick : function(event) {
    this.destroy();
  },
  
  /**
   * When user select item from the suggestion box, "xwiki:autosuggestion:itemSelected"
   * event will be triggered, onItemSelected handles the actions for these item selected.
   */ 
  onItemSelected : function(event) {
    var type = event.memo["type"];
    var selectedItem = event.memo["selectedValue"];
    switch(type) {
      case "link":
        this.completeLinkSuggestor(selectedItem);
        break;
      case "image":
        this.completeImageSuggestor(selectedItem);
        break;
      case "macro":
        this.completeMacroSuggestor(selectedItem);
        break;
    }    
  },
  
  /** 
   * When user unfocus on the editor, the suggestor will be destroyed
   * except when user focus on the suggestion box.
   */
  onBlur : function(event) {
    var thisObj = this;
    setTimeout(function(){
      if(document.activeElement.id != "content") {
        thisObj.destroy();
      }
    }, 500);
  },

  onKeyup : function(event) {
    var code = event.keyCode;
    // If left, right key is pressed, the suggestion box show not be instantiated
    // or should be destroyed if it has been intantiated.
    // left, right, esc, tab, pageup, pagedown, home, end
    var keyForDestroy = $A([0, Event.KEY_LEFT, Event.KEY_RIGHT, Event.KEY_ESC, EVENTKEYS.KEY_TAB, Event.KEY_PAGEUP, Event.KEY_PAGEDOWN, Event.KEY_HOME, Event.KEY_END]);
    if(keyForDestroy.include(code)) {
      if(this.suggestionBox != null && !this.suggestionBox.isDestroyed()) {
        this.currentTrigger = null;
        this.suggestionBox.destroy();
      }
      return;
    }
    // Suggestion should not be executed if the following keys are typed;
    // F1~F12, up, down, return, shift, ctrl, alt, insert, capslock,  print screen, pause, delete, numlock
    var keyForNotSuggest = $A([Event.KEY_UP, Event.KEY_DOWN, Event.KEY_RETURN, Event.KEY_INSERT, EVENTKEYS.KEY_SHIFT,EVENTKEYS.KEY_ALT, EVENTKEYS.KEY_CAPSLOCK, EVENTKEYS.KEY_NUMLOCK, EVENTKEYS.KEY_CONTROL, EVENTKEYS.KEY_PAUSE, EVENTKEYS.KEY_PRINT,  EVENTKEYS.KEY_F1, EVENTKEYS.KEY_F2, EVENTKEYS.KEY_F3, EVENTKEYS.KEY_F4, EVENTKEYS.KEY_F5, EVENTKEYS.KEY_F6, EVENTKEYS.KEY_F7, EVENTKEYS.KEY_F8, EVENTKEYS.KEY_F9, EVENTKEYS.KEY_F10, EVENTKEYS.KEY_F11, EVENTKEYS.KEY_F12]);
    if(!keyForNotSuggest.include(code)) {
      this.suggest();
    }
  },
  
  /**  
   * Give suggestion results.
   */
  suggest : function() {
    // To overwrite
  },
  
  /**  
   * Show the suggestion result list.
   * @Param query The query for suggestion list.
   */
  showSuggestions : function(query) {
    // Calculate the offset position of the suggestion box
    var markOffset = this.editor.getMarkOffset();
    var scrollTop = this.editor.getScrollTop();
    //suggestio box position, actually it is the mask position position which is represent the position of trigger.
    var position = {"top" : markOffset.top + 15 - scrollTop, "left" : markOffset.left + 8};
    
    // Todo: the size should adjust to the content, instead of fixing
    var size = {"width" : 300, "height" : 400};
    // Get the suggestions and show.
    this._showSuggestionResults(query, position, size);
  },
  
  /**
   * Get the suggestion results and show, it should be overwritten
   * by the specific suggestors.
   */
  _showSuggestionResults : function(query, position, size) {
    // To overwrite
  },

  /**  
   * Get the text of between the position of trigger and  
   * the position of current cursor position to be the query
   * for suggestion.
   * @Param triggerPos The trigger position
   * @Param currentPos The current position of the cursor
   */
  getQuery : function(triggerPos, currentPos) {
    return this.editor.getTextByPosition(triggerPos, currentPos);
  },

  /**  
   * Determin whether the current cursor position is in the context of the 
   * current trigger.
   */
  decideContext : function() {
    return this.editor.getCursorPosition() >= this.currentTrigger.pos;
  },

  /**  
   * Determin whether the trigger is triggered when user typing.
   * @param trigger The trigger name.
   */
  isTrigger : function(trigger) {
    var cursorPos = this.editor.getCursorPosition();
    var txtValueBeforeTrigger = this.editor.getTextByPosition(0, cursorPos);
    var val = txtValueBeforeTrigger.slice(-trigger.length);
    return val == trigger;
  }
});

/**  
 * Suggestor for link suggestion
 */
autosuggestion.LinkSuggestor = Class.create(autosuggestion.Suggestor, {
  /** The trigger for link*/
  linkTrigger : {trigger:"[[", pos:-1, close:"]]"},
  
  initialize : function($super, editor) {
    $super(editor);
  },
  
  /** @Overwrite */  
  suggest : function() {
    // Decide whether link trigger "[[" is triggered
    if(this.isTrigger(this.linkTrigger.trigger)) { 
      // Update the trigger positon
      this.linkTrigger.pos = this.editor.getCursorPosition();
      // Set the currentTrigger is link trigger, then it enters
      // the context of the link trigger
      this.currentTrigger = this.linkTrigger;
      // Destroy the existed suggestion box.
      if(this.suggestionBox != null) {
        this.suggestionBox.destroy();
      }
    }
    if(this.isTrigger(this.linkTrigger.close)) {
      if(this.suggestionBox != null) {
        this.suggestionBox.destroy();
      }
      this.currentTrigger = null;
    }
    if(this.currentTrigger == null){
      return;
    } 
    // Switch to different actions according to the current
    // trigger context.
    // Notice : There might be some other triggers under link
    // trigger context, like ">>","attach:","@" and "||"
    switch(this.currentTrigger.trigger) {
      case this.linkTrigger.trigger:
        this._actionLinkTriggered();
	break;
    }
  },
  
  _showSuggestionResults : function(query, position, size) {
    if(query == null) return;
    new Ajax.Request("/xwiki/bin/view/Main/queryJson?xpage=plain&outputSyntax=plain", {
      method : 'get',
      parameters : {"query":query},
      onSuccess : this._onSuccess.bind(this, position, size),
      onFailure : this._onFailure.bind(this)
    });
  },
  
  _onSuccess : function(position, size, response) { 
    var resultList = $H(response.responseJSON);
    if(this.suggestionBox == null || this.suggestionBox.isDestroyed()) {
      this.suggestionBox = new autosuggestion.LinkSuggestionBox(resultList, position, size, {"type":"wiki", "obj":this.editor.getTextArea()});
    }
    this.suggestionBox.showSuggestions(resultList, position, size);
  },
  
  _onFailure : function(response) {
    console.debug("suggestion failures:");
    console.debug(response);
  },

  /**  
   * The action executed when link trigger is triggered.
   */
  _actionLinkTriggered : function() {
    // Decide whether is under the context of the current trigger
    // There are several situations that when the current trigger 
    // is not changed, but the cursor is out of the current trigger
    // context. For example: onclick - move the cursor to other position
    // pageDown and pageUp... 
    if(!this.decideContext()) {
      console.debug("Out of the [[ trigger context, waiting...");
      this.currentTrigger = null;
      if(this.suggestionBox != null && !this.suggestionBox.isDestroyed()) {
        this.suggestionBox.destroy();
      }
      return;
    }
    this.editor.updateMask(this.linkTrigger);
    // Get the value user typed after the trigger as the query for suggestion
    var currentPos = this.editor.getCursorPosition();
    var query = this.getQuery(this.linkTrigger.pos, currentPos);
    console.debug("query for trigger [[:" + query);
    // Show the suggestion box for suggestion results.
    this.showSuggestions(query);
  }
});

/**  
 * The wrapper for wiki editors, there are many useful functions 
 * that add to the plain textArea object.
 */
autosuggestion.WikiEditor = Class.create({
  /** The textarea object of the wiki object*/
  textArea: null,
  mask : null,
 
  initialize : function(textArea) {
    this.textArea = $(textArea);
    if(this.textArea ==  null) {
      return;
    }
    // Reset css for editor
    this.textArea.addClassName("suggestion_editor");
  },

  getTextArea : function() {
    return this.textArea;
  },
  
  /** 
   * Get the scrollTop value of the textarea
   */
  getScrollTop : function() {
    return this.textArea.scrollTop;
  },

  /**  
   * Get the cursor position in the textarea. 
   */
  getCursorPosition : function() {
    if(document.selection){ // If the browser has document.selection object, like ie
      this.textArea.focus();
      var ds = document.selection;
      var range = null;
      range = ds.createRange();
      var storedRange = range.duplicate();
      storedRange.moveToElementText(this.textArea);
      storedRange.setEndPoint("EndToEnd", range);
      this.textArea.selectionStart = storedRange.text.length - range.text.length;
      this.textArea.selectionEnd = this.textArea.selectionStart + range.text.length;
      return this.textArea.selectionStart;
    }else{ // Firefox
      return this.textArea.selectionStart;
    }
  },

  /**  
   * Set the cursor position in the textarea. 
   */
  setCursorPosition : function(position) {
    var n = position == "end"? this.textArea.value.length : position;
    if(document.selection){
      var range = t.createTextRange();
      range.moveEnd("character", -this.textArea.value.length);
      range.moveEnd("character", n);
      range.moveStart("character", n);
      range.select();
    }else{
      this.textArea.setSelectionRange(n, n);
      this.textArea.focus();
    }
  },
  
  /**  
   * Get the text in the teatarea from start to end
   * @Param start The start position of the text 
   * @Param end The end position of the text
   */
  getTextByPosition : function(start, end) { 
    if(start == null && end == null) return this.textArea.value;
    if(end == null) end = this.textArea.value.length-1;
    return this.textArea.value.substring(start, end);
  },
 
  /**  
   * Get offset position and size of the textarea. 
   */
  getEditorOffset : function() {
    var offsetPosition = this.textArea.cumulativeOffset();
    var offsetWidth = this.textArea.getWidth();
    var offsetHeight = this.textArea.getHeight();
    return {"top":offsetPosition.top, "left":offsetPosition.left, "width":offsetWidth, "height":offsetHeight};
  },

  /**  
   * Add the mask which duplicates the content of the textarea
   * It is above the textarea, with the same offset positions, styles
   * and size. But the z-index is under the textarea and the visibility
   * is hidden. 
   * With the mask's help we can get the trigger offset positions which 
   * is neccessary for showing the suggestion box in the right place beside
   * the trigger.
   */
  addMask : function() {
    if (this.mask == null) {
      this.mask = new Element('div', {'class':'suggestion_mask'});
      document.body.appendChild(this.mask);
    }
    this._updateMaskOffset();
  },

  /**  
   * Update the mask, include two things:
   * 1) Update the content of the mask. see @_updateMaskContent(trigger);
   * 2) Update the offset of the mask. see @_updateMaskOffset();
   */
  updateMask : function(trigger) {
    // It is for fullscreen, the display of mask will be set to none by default
    // in order to get get the mark's position, the display of mask should always
    // keep block;
    this.mask.show();
    this._updateMaskContent(trigger);
    this._updateMaskOffset();
  },

  /**  
   * Update the content to syncronized with the textarea when suggestion 
   * is triggered before suggestion box is shown, and also add the mark of
   * which holds the trigger. 
   * In order to get the trigger's offset positon, the trigger will be
   * marked by surrounding with <span id="suggestion_mark">trigger</span>,
   * for example <span id="suggestion_mark">[[</span>, then when deciding
   * the offset position of the trigger, it should only get the position of
   * the surrounded "span" mark.
   * @Param trigger The trigger which is triggered currently.
   */
  _updateMaskContent : function(trigger) {
    var html = "";
    var query = this.getTextByPosition(trigger.pos, this.getCursorPosition());
    // Set the value of textarea before trigger
    html += this.getTextByPosition(0, trigger.pos - trigger.trigger.length).replace(/\n/g, '<br/>').replace(/\s/g, '<span class="suggestion_mask_whiteSpace"> </span>');
    // Surround the trigger with mark
    if(!query) {
      html += "<span id='suggestion_mark'>" + trigger.trigger + "</span>";
    } else {
      html += trigger.trigger +  query.substring(0, query.length-1) + "<span id='suggestion_mark'>" + query.substring(query.length-1)  + "</span>";
    }
    // Set the value of textarea after trigger
    html += this.getTextByPosition(trigger.pos, this.textArea.value.length).replace(/\n/g, '<br/>').replace(/\s/g, '&nbsp;');
    // Update mask above the textarea
    this.mask.update(html);
  },

  /**  
   * Update the Mask, include position, scrollTop and the styles which should be the same with text area.
   */
  _updateMaskOffset : function() {
    var textAreaFontFamily = this.textArea.getStyle("font-family");
    var textAreaLineHeight = this.textArea.getStyle("line-height");
    var info = this.getEditorOffset();

    this.mask.setStyle({
      fontFamily : textAreaFontFamily,
      lineHeight : textAreaLineHeight,
      top: info.top + "px",
      left: info.left + "px",
      width: (info.width-2) + "px",
      height: info.height + "px"
    });

    this.mask.scrollTop = this.textArea.scrollTop;
  },
  
  /**  
   * Get offset of the "span" mark of the trigger.
   * It is represented the position of the suggestion box.
   */
  getMarkOffset : function() {
    return $("suggestion_mark") == null ? null : $("suggestion_mark").cumulativeOffset();
  }
});


/**
 * Suggestion Box is used to hold the suggestion list for auto suggestion
 */
autosuggestion.SuggestionBox = Class.create({
  /** The position to show the suggestion box */ 											
  position : null,
  /** The default size of the suggestion box */
  size : {"width":200, "height":400},
  /** The title for suggestion box */
  title : "",
  /** {"type:"wiki/wysiwyg, "obj":editorObj} */
  editor : null, 
  /** The selected index for suggestion list */
  index : -1,
  
  /** The Html template for suggestion box container */
  /*containerHtmlTemplate : '<div id="suggestion_box_container">'
  	+'<div id="suggestion_box" class="container">'
	  +'<div id="suggestion_head">
             +'<div id="suggestion_title"></div>'
             +'<div style='clear:both'></div>'
          +'</div>'
	  +'<div id="suggestion_resultList"></div>'
	  +'<div id="suggestion_toolbar"></div>'
	+'</div>'
  +'</div>',*/
  /**
   * Initialization: Add the suggestion box dom to the end of body and update the position and size 
   * of the suggestion box
   */
  initialize : function(position, size, editor) {
    if(editor == null){
      return;
    }
    this.editor = editor;
    this.index = -1;
    // The container of the suggestion box
    var suggestion_box_container = new Element('div', {'id' : 'suggestion_box_container'});
    // The suggestion box
    var suggestion_box = new Element('div', {'class' : 'container', 'id' : 'suggestion_box'});
    suggestion_box_container.appendChild(suggestion_box);
    // The title container of suggestion box
    var suggestion_head = new Element('div', {'id' : 'suggestion_head'});
    suggestion_box.appendChild(suggestion_head);
    var suggestion_title = new Element('div', {'id' : 'suggestion_title'});
    var suggestion_clear = new Element('div', {'style' : 'clear:both'});
    suggestion_head.appendChild(suggestion_title);
    suggestion_head.appendChild(suggestion_clear);
    // The suggestion list container of the suggestion box
    var suggestion_resultList = new Element('div', {'id' : 'suggestion_resultList'});
    suggestion_box.appendChild(suggestion_resultList);
	// Toolbar container is only for wysiwyg editor
    if(this.editor.type == "wysiwyg") {
      var suggestion_toolbar = new Element('div', {'id' : 'suggestion_toolbar'});
      suggestion_box.appendChild(suggestion_toolbar);
    }
    document.body.appendChild(suggestion_box_container);
  },
  
  /**
   * Destroy the suggestion box, include: 
   * 1) Unbind the events of the suggestion box;
   * 2) Remove the dom of the suggestion box;
   */
  destroy : function() {
    if($('suggestion_box_container') == null) {
      return;
    }
    // Remove the suggestion box
    this.unBindSuggestionBoxEvents();
    $('suggestion_box_container').remove();
  },
  
  /**
   * Update the position and the size of the suggestion box 
   */
  updatePosition : function(position, size){
    if(position == null) return;
    if(size == null) size = this.size;
    this.size = size;
    this.position = position;
    $("suggestion_box_container").setStyle({
      "top": position.top + "px",
      "left": position.left + "px",
      "width": size.width + "px",
      "height": size.height + "px",
    });
  },
  
  /**
   * Get the position and the size of the suggestion box 
   */
  getPosition : function() {
    if($("suggestion_box_container") == null) {
      return;
    }
    var offsetPosition = $("suggestion_box_container").cumulativeOffset();
    var offsetWidth = $("suggestion_box_container").getWidth();
    var offsetHeight = $("suggestion_box_container").getHeight();
    return {"top":offsetPosition.top, "left":offsetPosition.left, "width":offsetWidth, "height":offsetHeight};
  },
  
  isDestroyed : function(){
    return $("suggestion_box_container") == null ? true : false;
  },

  /**
   * Global listener for clicking the suggestion items in the suggestion box
   * @Param index The index of the clicked suggestion item
   * @Param itemList All the item doms in the suggestion box
   * @Param event The click event
   */
  onItemClick : function(index, itemList, event){
    this.itemClickHandler(index, itemList);
    //Focus on the editor in order to listen to the event specific to editor
    //like key navigation
    this.editor.obj.focus();
    itemList[index].addClassName("itemSelected");
  },
  
  /**
   * Global listener for double clicking the suggestion items in the suggestion box
   * @Param index The index of the clicked suggestion item
   * @Param itemList All the item doms in the suggestion box
   * @Param event The click event
   */
  onItemDbClick : function(index, itemList, event){
    this.itemDbClickHandler(index, itemList);
  },
  
  /**
   * Global listener for navigating the suggestion items by up and down keys
   * @Param itemList All the item doms in the suggestion box
   * @Param event The click event
   */
  onKeyNavigate : function(itemList, event) {
    var keyCode = event.keyCode;
    var i = this.index;
    switch(keyCode){
      case 40:
        i = i + 1;
        break;
      case 38:
        i = i - 1;
        break;
      case 13:
        var selectedValue = this.getSelectedItemValue(i);
        console.debug("selected item value:" + selectedValue);
        document.fire("xwiki:autosuggestion:itemSelected", {selectedValue:selectedValue});
        this.destroy();
        Event.stop(event);  
        return false;
        break;
      default:
        return true;
    }
    Event.stop(event);
    i = i >= itemList.length ? 0 : i< 0 ? itemList.length-1 : i;
    return this.keyNavigateHandler(i, itemList);
  },
  
  /**
   * To show the results in the suggestion box
   * @Param results The suggestion results(json) for suggestion box
   * @Param position The position of the suggestion box
   * @Param size The size of the suggestion box
   */
  showSuggestion : function(results, position, size){
    //To overwirte
  },
  
  /**
   * Handler for clicking the suggestion items
   */
  itemClickHandler :function(index, itemList, event) {
    // To overwrite
  },
  
  /**
   * Handler for double clicking the suggestion items
   */
  itemDbClickHandler :function(index, itemList, event) {
    // To overwrite
  },
  
  /**
   * Handler for navigating the items by up and down keys.
   */
  keyNavigateHandler :function(index, itemList) {
    // To overwrite
  },
  
  /**
   * Bind the events to the suggestion box
   */
  bindSuggestionBoxEvents : function(){
    //To overwrite
  },
  
  /**
   * unBind the events of the suggestion box
   */
  unBindSuggestionBoxEvents : function(){
    //To overwrite
  },
  
  /**
   * Get the selected item's value
   * @Param index The index of the selected item
   */
  getSelectedItemValue : function(index) {
    // To overwrite
  }
});

/**
 * Suggestion Box for link suggestion
 */
autosuggestion.LinkSuggestionBox = Class.create(autosuggestion.SuggestionBox,{
  /** The title for link suggestion */ 	
  title : "Link Suggestions:",
  /** The page results */ 	
  pageItemValues : null,
  /** The attachment results */ 	
  attachmentItemValues : null,
  
  /*linkHtmlTemplate : '<div id="suggestion_wikipage">'
  +'</div>'
  +'<div id="suggestion_attachment">'
  +'</div>',*/
  
  /**
   * Initialization: Add the Containers for pages and attachments results
   */
  initialize : function($super, results, position, size, editor) {
    $super(position, size, editor);
    $("suggestion_title").update(this.title);
    this.pageItemValues = results.get('pages');
    this.attachmentItemValues = results.get('attachments');
  },
  
  /** @Overwrite */
  showSuggestions : function(results, position, size) {
    if(this.isDestroyed()){
      return;
    }
    this.pageItemValues = results.get('pages');
    this.attachmentItemValues = results.get('attachments');
    if(this.pageItemValues == null && this.attachmentItemValues == null) {
      this.destroy();
      return;
    }
	
    // Clear the existed suggestion list
    this.unBindSuggestionBoxEvents(); 
    if($("suggestion_wikipage")) $("suggestion_wikipage").remove();
    if($("suggestion_attachment")) $("suggestion_attachment").remove();
	
    // Update the position and the size of suggestion box
    this.updatePosition(position, size);
    // Reset the index to -1, no item selected
    this.index = -1;

    if(this.pageItemValues != null) {
      // Show the attachment results
      this._showPageSuggestions();
    }
	
    if(this.attachmentItemValues != null) {
      // Show the attachment results
      this._showAttachmentSuggestions();
    }
	
    this.bindSuggestionBoxEvents(); 
  },
  
  /**
   * Show the page results
   */
  _showPageSuggestions : function() {
    if(this.pageItemValues == null) {
      return;
    }
    var suggestion_wikipage = new Element('div', {'id' : 'suggestion_wikipage'});
    $("suggestion_resultList").insert({top: suggestion_wikipage});
	
    this.pageItemValues.each(function(obj, index){
      var pageDiv = new Element('div', {'class' : 'pageItem'});		
      var titleDiv = new Element('div', {'class' : 'pageItemTitle'}); 
      titleDiv.insert(obj.title);
      	  
      var fullNameDiv = new Element('div', {'class' : 'pageItemFullname'}); 
      fullNameDiv.insert(obj.path);
      	  
      pageDiv.appendChild(titleDiv);
      pageDiv.appendChild(fullNameDiv);
      suggestion_wikipage.appendChild(pageDiv);
      suggestion_wikipage.scrollTop = 0;
    })
  },
  
  /**
   * Show the attachment results
   */
  _showAttachmentSuggestions : function() {
    var suggestion_attachment = new Element('div', {'id' : 'suggestion_attachment'});
    $("suggestion_resultList").insert({bottom: suggestion_attachment});
    var thisObj =  this;
    this.attachmentItemValues.each(function(obj, index){
      var attachmentDiv = new Element('div', {'class' : 'attachmentItem'});		
      var titleDiv = new Element('div', {'class' : 'attachmentItemTitle'});		 
      titleDiv.insert(obj.title);
	  
      attachmentDiv.appendChild(titleDiv);		
      suggestion_attachment.appendChild(attachmentDiv);
      suggestion_attachment.scrollTop = 0;
    })
  },  
  
  /** @Overwrite */
  itemClickHandler : function(index, itemList){
    this.index = index;
    itemList.each(function(obj) {
      obj.removeClassName("itemSelected")
    });
  },
  
  /** @Overwrite */
  itemDbClickHandler : function(index, itemList){
    this.index = index;
    var results = this.pageItemValues.concat(this.attachmentItemValues);
    console.debug("selected item value:" + results[index]);
    document.fire("xwiki:autosuggestion:itemSelected", {selectedValue:results[index]});
    this.destroy();// todo: this.destroy()
  },
  
  /** @Overwrite */
  keyNavigateHandler : function(index, itemList){
    var titleContainerHeight = $("suggestion_head").getHeight(); 
    var pageContainerHeight = $("suggestion_wikipage") == null ? 0 : $("suggestion_wikipage").getHeight();
    //console.debug("pageContainerHeight:"+pageContainerHeight);
    var attachmentContainerHeight = $("suggestion_attachment") == null ? 0 : $("suggestion_attachment").getHeight();
    //console.debug("attachmentContainerHeight:"+attachmentContainerHeight);
    var pageItemValuesLength = this.pageItemValues == null ? 0 : this.pageItemValues.length;
    var attachmentItemValuesLength = this.attachmentItemValues == null ? 0 : this.attachmentItemValues.length;
	
    var selectedItem = itemList[index];
    var relativeTop = selectedItem.positionedOffset().top - titleContainerHeight;	
	
    if(this.pageItemValues && index < pageItemValuesLength) {
      var scrollTop = $("suggestion_wikipage").scrollTop;
      //console.debug("wikipage_relativeTop:"+relativeTop)
      //console.debug("wikipage_scrollTop:"+scrollTop)
      if(relativeTop <= scrollTop) {
 	$("suggestion_wikipage").scrollTop -= scrollTop - relativeTop;
      }
      if(relativeTop + selectedItem.getHeight() >= pageContainerHeight+scrollTop) {
  	$("suggestion_wikipage").scrollTop += relativeTop - (pageContainerHeight+scrollTop) + selectedItem.getHeight();
      }
    }
	
    if(this.attachmentItemValues &&  index >= pageItemValuesLength) {
      if(index == pageItemValuesLength) {
  	$("suggestion_attachment").scrollTop = 0;
      }
      var scrollTop = $("suggestion_attachment").scrollTop;
      //console.debug("attachment_scrollTop:"+scrollTop)
      relativeTop = relativeTop - pageContainerHeight;
      //console.debug("attachment_relativeTop:"+relativeTop)
      if(relativeTop <= scrollTop) {
	$("suggestion_attachment").scrollTop -= scrollTop - relativeTop;
      }
      if(relativeTop + selectedItem.getHeight() >=attachmentContainerHeight+scrollTop) {
	$("suggestion_attachment").scrollTop += relativeTop - (attachmentContainerHeight+scrollTop) + selectedItem.getHeight();
      }
    }
	
    if(this.index >= 0){
      itemList[this.index].removeClassName("itemSelected");
    }
    itemList[index].addClassName("itemSelected");
    this.index = index;
    return false;
  },
  
  /**
   * @Overwrite
   * Bind the events to the suggestion box when the suggestion box is shown
   */
  bindSuggestionBoxEvents : function(){
    var itemList = this._concatItems();
	
    this.onKeyNavigateBound = this.onKeyNavigate.bind(this, itemList);
    this.editor.obj.observe("keydown", this.onKeyNavigateBound);
    // Listen to the click and dbclick events;
    for(var i=0; i < itemList.length; i++){
      itemList[i].observe("click", this.onItemClick.bind(this, i, itemList));
      itemList[i].observe("dblclick", this.onItemDbClick.bind(this, i, itemList));
    }
  },
  
  _concatItems : function() {
    var pageItemList = $$("#suggestion_wikipage div.pageItem");
    var attachmentItemList = $$("#suggestion_attachment div.attachmentItem");
    return pageItemList.concat(attachmentItemList);
  },
  
  /**
   * @Overwrite
   * Unbind the events of the suggestion box when the suggestion box is destroyed
   */
  unBindSuggestionBoxEvents : function(){
    var itemList = this._concatItems();
	
    this.editor.obj.stopObserving("keydown", this.onKeyNavigateBound);
    // Stop listening to the suggestion list
    for(var i=0; i < itemList.length; i++){
      itemList[i].stopObserving('click');
      itemList[i].stopObserving('dblclick');
    }
  },
  
  /** @Overwrite */
  getSelectedItemValue : function(index){
    if(index < this.pageItemValues.length) {
      return this.pageItemValues[index];
    } else {
      return this.attachmentItemValues[index];
    }
  }
});

/**
 * Suggestion Box for image suggestion
 */
autosuggestion.ImageSuggestionBox = Class.create(autosuggestion.SuggestionBox,{
/** The title for link suggestion */
  title : "Image Suggestions:",
  /** The page results */
  imageItemValues : null,

  /*ImageHtmlTemplate : '<div id="suggestion_images">'
  +'</div>'*/

  /**
   * Initialization: Add the Containers for pages and attachments results
   */
  initialize : function($super, results, position, size, editor) {
    $super(position, size, editor);
    $("suggestion_title").update(this.title);
    this.imageItemValues = results;
  },

  /**
   * @Overwrite
   * Also remove the image perviewer.
   */
  destroy : function($super) {
    $super();
    if($("suggestion_imagePreview") != null) {
      $("suggestion_imagePreview").remove();
    }
  }, 

  /** @Overwrite */
  showSuggestions : function(results, position, size) {
    if(this.isDestroyed()){
      return;
    }
    this.imageItemValues = results;
    if(this.imageItemValues == null) {
      this.destroy();
      return;
    }

    // Clear the existed suggestion list
    this.unBindSuggestionBoxEvents();
    if($("suggestion_images")) $("suggestion_images").remove();

    // Update the position and the size of suggestion box
    this.updatePosition(position, size);
    // Reset the index to -1, no item selected
    this.index = -1;

    if(this.imageItemValues != null) {
      // Show the attachment results
      this._showImageSuggestions();
    }

    this.bindSuggestionBoxEvents();
  },
  
  /**
   * Show the page results
   */
  _showImageSuggestions : function() {
    if(this.imageItemValues == null) {
      return;
    }
    var suggestion_images = new Element('div', {'id' : 'suggestion_images'});
    $("suggestion_resultList").insert({top: suggestion_images});

    this.imageItemValues.each(function(obj, index){
      var imageDiv = new Element('div', {'class' : 'imageItem'});

      var snapshotDiv = new Element('div', {'class' : 'imageSnapshot'});
      imageDiv.appendChild(snapshotDiv);
      var imageSnapshot = new Element('img', {'src': obj.url, 'class' : 'imageSnapshotSize'})
      snapshotDiv.appendChild(imageSnapshot);

      var descriptionDiv = new Element('div', {'class' : 'imageDescription'});
      imageDiv.appendChild(descriptionDiv);

      var titleDiv = new Element('div', {'class' : 'imageItemTitle'});
      titleDiv.insert(obj.title);

      var fullNameDiv = new Element('div', {'class' : 'imageItemFullname'});
      fullNameDiv.insert(obj.fullname);

      descriptionDiv.appendChild(titleDiv);
      descriptionDiv.appendChild(fullNameDiv);

      var clearDiv = new Element('div', {'style' : 'clear:both'});
      imageDiv.appendChild(clearDiv)

      suggestion_images.appendChild(imageDiv);
      suggestion_images.scrollTop = 0;
    })
  },
  
  /**
   * Show the image Preview of the selected image
   */
  _showImagePreview : function() {
    var imagePreview = $("suggestion_imagePreview");
    if(this.index == -1 && imagePreview != null) {
      imagePreview.remove();
      return;
    }
    if(imagePreview == null) {
      var top = this.position.top + $("suggestion_head").getHeight();
      var left = this.position.left + $("suggestion_box_container").getWidth();
      var height = $("suggestion_resultList").getHeight() - $("suggestion_head").getHeight();
      imagePreview = new Element('div', {'id' : 'suggestion_imagePreview', 'style':'top:'+ top +'px; left:'+ left +'px; height:'+ height +'px'});
      document.body.appendChild(imagePreview);
    }
    var imageObj = this.imageItemValues[this.index];
    imagePreview.update("<img src='"+ imageObj.url +"'/>");
  },  

  /** @Overwrite */
  itemClickHandler : function(index, itemList){
    this.index = index;
    itemList.each(function(obj) {
      obj.removeClassName("itemSelected")
    });
    this._showImagePreview();
  },

  /** @Overwrite */
  itemDbClickHandler : function(index, itemList){
    this.index = index;
    console.debug("selected item value:" + this.imageItemValues[index]);
    document.fire("xwiki:autosuggestion:itemSelected", {selectedValue:this.imageItemValues[index]});
    this.destroy();// todo: this.destroy()
  },

  /** @Overwrite */
  keyNavigateHandler : function(index, itemList){
    var titleContainerHeight = $("suggestion_head").getHeight();
    var imageContainerHeight = $("suggestion_images") == null ? 0 : $("suggestion_images").getHeight();
    //console.debug("imageContainerHeight:"+imageContainerHeight);
    var imageItemValuesLength = this.imageItemValues == null ? 0 : this.imageItemValues.length;

    var selectedItem = itemList[index];
    var relativeTop = selectedItem.positionedOffset().top - titleContainerHeight;

    if(this.imageItemValues && index < imageItemValuesLength) {
      var scrollTop = $("suggestion_images").scrollTop;
      //console.debug("wikipage_relativeTop:"+relativeTop)
      //console.debug("wikipage_scrollTop:"+scrollTop)
      if(relativeTop <= scrollTop) {
        $("suggestion_images").scrollTop -= scrollTop - relativeTop;
      }
      if(relativeTop + selectedItem.getHeight() >= imageContainerHeight+scrollTop) {
        $("suggestion_images").scrollTop += relativeTop - (imageContainerHeight+scrollTop) + selectedItem.getHeight();
      }
    }

    if(this.index >= 0){
      itemList[this.index].removeClassName("itemSelected");
    }
    itemList[index].addClassName("itemSelected");
    this.index = index;  
    this._showImagePreview();
    return false;
  },

  /**
   * @Overwrite
   * Bind the events to the suggestion box when the suggestion box is shown
   */
  bindSuggestionBoxEvents : function(){
    var itemList = $$("#suggestion_images div.imageItem");

    this.onKeyNavigateBound = this.onKeyNavigate.bind(this, itemList);
    this.editor.obj.observe("keydown", this.onKeyNavigateBound);
    // Listen to the click and dbclick events;
    for(var i=0; i < itemList.length; i++){
      itemList[i].observe("click", this.onItemClick.bind(this, i, itemList));
      itemList[i].observe("dblclick", this.onItemDbClick.bind(this, i, itemList));
    }
  },

  /**
   * @Overwrite
   * Unbind the events of the suggestion box when the suggestion box is destroyed
   */
  unBindSuggestionBoxEvents : function(){
    var itemList = $$("#suggestion_images div.imageItem");

    this.editor.obj.stopObserving("keydown", this.onKeyNavigateBound);
    // Stop listening to the suggestion list
    for(var i=0; i < itemList.length; i++){
      itemList[i].stopObserving('click');
      itemList[i].stopObserving('dblclick');
    }
  },

  /** @Overwrite */
  getSelectedItemValue : function(index){
    if(index < this.imageItemValues.length) {
      return this.imageItemValues[index];
    } else {
      return null;
    }
  }

});

/**
 * Suggestion Box for macro suggestion
 */
autosuggestion.MacroSuggestionBox = Class.create(autosuggestion.SuggestionBox,{
});
// End XWiki augmentation.
return XWiki;
}(XWiki || {}));

// Init test tools for suggestion box.
document.observe('xwiki:dom:loaded', function() {
  var testLinkSuggestionBox = function(){
    var suggestionBox = null;
    var editor = $("content");
    var testBox = new Element('div', {'id' : 'testBox'});
    testBox.setStyle({"padding":"2px 0", "border":"1px solid #bebebe"});
    $("xwikitext").insert({top:testBox});
    testBox.insert("Page Results: <input type='text' id='pageResults' value='[\"page1\", \"page2\", \"page3\", \"page4\", \"page5\", \"page6\"]' size=80/><br/>"
                                 +"Attachment Results: <input type='text' id='attachmentResults' value='[\"attachment1\", \"attachment2\", \"attachment3\", \"attachment4\", \"attachment5\", \"attachment6\"]'  size=80/><br/>"
                                 +"top : <input type='text' id='boxtop' value='0' size=5/>px left : <input type='text' id='boxleft' value='0' size=5/>px<br/>"
                                 +"width : <input type='text' id='boxwidth' value='200' size=5/>px height : <input type='text' id='boxheight' value='400' size=5/>px<br/>"
                                 +"<input type='button' id='testshow' value='Show suggestion box'/> "
                                 +"<input type='button' id='testRemove' value='Remove suggestion box'/> ");

    $("testshow").observe("click", function(event){
      var pageResults = $("pageResults").value;
      if(pageResults == ""){
        pageResults = null;
      }else{
        pageResults = pageResults.evalJSON()
      }
      var attachmentResults = $("attachmentResults").value
      if(attachmentResults == ""){
        attachmentResults = null;
      }else{
        attachmentResults = attachmentResults.evalJSON()
      }
      var results = $H({"pages":pageResults, "attachments":attachmentResults})

      var editorOffset = editor.cumulativeOffset();
      //console.debug(document.viewport.getScrollOffsets());
      //console.debug(editor.cumulativeOffset());
      //console.debug(editor.cumulativeScrollOffset());
      //console.debug(editorOffset);
      var top = parseInt($("boxtop").value);
      var left = parseInt($("boxleft").value);
      var width = parseInt($("boxwidth").value);
      var height = parseInt($("boxheight").value);
      if(top<editorOffset.top || top>editorOffset.top+testBox.getHeight() || left<editorOffset.left || left>editorOffset.left+testBox.getWidth()){
        alert("The position of suggestion box must between top:"+editorOffset.top+" - "+(editorOffset.top+testBox.getHeight())+"  and left:"+editorOffset.left+" - "+(editorOffset.left+testBox.getWidth()));
        return;
      }
      if(suggestionBox == null || suggestionBox.isDestroyed()) {
        suggestionBox = new XWiki.autosuggestion.LinkSuggestionBox(results, {"top":top, "left":left}, {"width":width, "height":height}, {"type":"wiki", "obj":editor});
      }
      suggestionBox.showSuggestions(results, {"top":top, "left":left}, {"width":width, "height":height});
      editor.focus();
    })

    $("testRemove").observe("click", function(event){
      suggestionBox.destroy();
      suggestionBox = null;
    });

  }  

  // Test image suggestion box
  var testImageSuggestionBox = function() {
    var suggestionBox = null;
    var editor = $("content");
    var testBox = new Element('div', {'id' : 'testBox'});
    testBox.setStyle({"padding":"2px 0", "border":"1px solid #bebebe"});
    $("xwikitext").insert({top:testBox});
    testBox.insert("Image Results: <input type='text' id='imageResults' value='[{\"url\":\"http://farm6.static.flickr.com/5235/5852377601_b3f165b9d4_s.jpg\", \"title\":\"A nice picture1\", \"fullname\":\"Located in xwiki >> Xwiki >> Xwikigallery\"}, {\"url\":\"http://farm4.static.flickr.com/3074/5855874578_07df3ac848_s.jpg\", \"title\":\"A nice picture2\", \"fullname\":\"Located in xwiki >> Xwiki >> Xwikigallery\"}, {\"url\":\"http://farm6.static.flickr.com/5272/5864590841_78060e58ec_s.jpg\", \"title\":\"A nice picture3\", \"fullname\":\"Located in xwiki >> Xwiki >> Xwikigallery\"}, {\"url\":\"http://farm6.static.flickr.com/5160/5800480924_dab675815f_s.jpg\", \"title\":\"A nice picture4\", \"fullname\":\"Located in xwiki >> Xwiki >> Xwikigallery\"},{\"url\":\"http://farm6.static.flickr.com/5238/5857007301_f482b99845_s.jpg\", \"title\":\"A nice picture5\", \"fullname\":\"Located in xwiki >> Xwiki >> Xwikigallery\"}]' size=80/><br/>"
				 +"top : <input type='text' id='boxtop' value='0' size=5/>px left : <input type='text' id='boxleft' value='0' size=5/>px<br/>"
				 +"width : <input type='text' id='boxwidth' value='300' size=5/>px height : <input type='text' id='boxheight' value='400' size=5/>px<br/>"
				 +"<input type='button' id='testshow' value='Show suggestion box'/> "
				 +"<input type='button' id='testRemove' value='Remove suggestion box'/> ");
  
    $("testshow").observe("click", function(event){	
      var imageResults = $("imageResults").value;
      if(imageResults == ""){
        imageResults = null;
      }else{
        imageResults = imageResults.evalJSON()
      }
      var results = imageResults
	
      var editorOffset = editor.cumulativeOffset();
      //console.debug(document.viewport.getScrollOffsets());
      //console.debug(editor.cumulativeOffset());
      //console.debug(editor.cumulativeScrollOffset());
      //console.debug(editorOffset);
      var top = parseInt($("boxtop").value);
      var left = parseInt($("boxleft").value);
      var width = parseInt($("boxwidth").value);
      var height = parseInt($("boxheight").value);
      if(top<editorOffset.top || top>editorOffset.top+testBox.getHeight() || left<editorOffset.left || left>editorOffset.left+testBox.getWidth()){
        alert("The position of suggestion box must between top:"+editorOffset.top+" - "+(editorOffset.top+testBox.getHeight())+"  and left:"+editorOffset.left+" - "+(editorOffset.left+testBox.getWidth()));
        return;
      }
      if(suggestionBox == null || suggestionBox.isDestroyed()) {
        suggestionBox = new XWiki.autosuggestion.ImageSuggestionBox(results, {"top":top, "left":left}, {"width":width, "height":height}, {"type":"wiki", "obj":editor});
      }  
      suggestionBox.showSuggestions(results, {"top":top, "left":left}, {"width":width, "height":height});
      editor.focus();
    })
  
    $("testRemove").observe("click", function(event){
      suggestionBox.destroy();
      suggestionBox = null;
    });
  }

  var testSuggestor = function() {
    var linkSuggestor = new XWiki.autosuggestion.LinkSuggestor("content");
    linkSuggestor.start();
  }
  //testLinkSuggestionBox();
  //testImageSuggestionBox();
  testSuggestor();
});
