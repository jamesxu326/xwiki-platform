// ======================================
// Auto Suggestion for wiki editors
// 
var XWiki = (function (XWiki) {
// Start XWiki augmentation.
var autosuggestion = XWiki.autosuggestion = XWiki.autosuggestion || {};

var EVENTKEYS = {
  KEY_NUMLOCK: 136,
  KEY_CAPSLOCK: 20,
  KEY_SHIFT: 16,
  KEY_ALT: 18,
  KEY_CONTROL: 17,
  KEY_SPACE: 32,
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
    this.destroy();
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
    // Listen to the shortcut for recovering the suggestion context.
    if(event.ctrlKey && code == Event.KEY_RETURN) {
      this.continueSuggest(); 
    }
    // If left, right key is pressed, the suggestion box show not be instantiated
    // or should be destroyed if it has been intantiated.
    // left, right, esc, tab, pageup, pagedown, home, end
    var keyForDestroy = $A([0, Event.KEY_LEFT, Event.KEY_RIGHT, Event.KEY_ESC, Event.KEY_TAB, Event.KEY_PAGEUP, Event.KEY_PAGEDOWN, Event.KEY_HOME, Event.KEY_END]);
    if(keyForDestroy.include(code)) {
      if(this.suggestionBox != null && !this.suggestionBox.isDestroyed()) {
        this.currentTrigger = null;
        this.suggestionBox.destroy();
      }
      return;
    }
    // Suggestion should not be executed if the following keys are typed;
    // F1~F12, up, down, return, shift, ctrl, alt, insert, capslock,  print screen, pause, delete, numlock
    var keyForNotSuggest = $A([Event.KEY_UP, Event.KEY_DOWN, Event.KEY_RETURN, Event.KEY_INSERT, EVENTKEYS.KEY_SHIFT, EVENTKEYS.KEY_ALT, EVENTKEYS.KEY_CAPSLOCK, EVENTKEYS.KEY_NUMLOCK, EVENTKEYS.KEY_CONTROL,  EVENTKEYS.KEY_F1, EVENTKEYS.KEY_F2, EVENTKEYS.KEY_F3, EVENTKEYS.KEY_F4, EVENTKEYS.KEY_F5, EVENTKEYS.KEY_F6, EVENTKEYS.KEY_F7, EVENTKEYS.KEY_F8, EVENTKEYS.KEY_F9, EVENTKEYS.KEY_F10, EVENTKEYS.KEY_F11, EVENTKEYS.KEY_F12]);
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
   * Recover the context of the suggestions when user types shortcuts
   * "ctrl+enter"
   */
  continueSuggest : function() {
    // To overwrite
  },
  
  /**  
   * Show the suggestion result list.
   * @Param query The query for suggestion list.
   */
  showSuggestions : function(requestUrl, query) {
    // Calculate the offset position of the suggestion box
    var markOffset = this.editor.getMarkOffset();
    var scrollTop = this.editor.getScrollTop();
    //suggestio box position, actually it is the mask position position which is represent the position of trigger.
    var position = {"top" : markOffset.top + 15 - scrollTop, "left" : markOffset.left + 8};
    
    // Todo: the size should adjust to the content, instead of fixing
    var size = {"width" : 300, "height" : 400};
    // Get the suggestions and show.
    this._showSuggestionResults(requestUrl, query, position, size);
  },
  
  /**
   * Get the suggestion results and show, it should be overwritten
   * by the specific suggestors.
   */
  _showSuggestionResults : function(requestUrl, query, position, size) {
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
    return this.editor.getTextByPosition(triggerPos, currentPos).replace(/\\/g, '')
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
  /** Label is not a trigger,but it is a mark*/
  labelTrigger : {trigger:">>", pos:-1, close:null},
  /** The sub-trigger for attachments*/
  attachTrigger : {trigger:"attach:", pos:-1, close:null},
  /** The sub-trigger for getting pages or attachments of the specific space*/
  spaceTrigger : {trigger:".", pos:-1, close:null},
  /** The sub-trigger for attachments of specific page*/
  atTrigger : {trigger:"@", pos:-1, close:null},

  maxResultNum : 30,
  maxPagesViewNum : 5,
  maxAttachmentsViewNum : 3,

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

    // Decide whether attach trigger "attach:" is triggered
    if(this.isTrigger(this.attachTrigger.trigger)) {
      this.attachTrigger.pos = this.editor.getCursorPosition();
      this.currentTrigger = this.attachTrigger;
      if(this.suggestionBox != null) {
        this.suggestionBox.destroy();
      }
    }

    // Decide whether space trigger "." is triggered
    if(this.isTrigger(this.spaceTrigger.trigger) && !this.isTrigger("\\" + this.spaceTrigger.trigger)) {
      this.spaceTrigger.pos = this.editor.getCursorPosition();
      this.currentTrigger = this.spaceTrigger;
      if(this.suggestionBox != null) {
        this.suggestionBox.destroy();
      }
    }
   
    // Decide whether at trigger "@" is triggered
    if(this.isTrigger(this.atTrigger.trigger) && !this.isTrigger("\\" + this.atTrigger.trigger)) {
      this.atTrigger.pos = this.editor.getCursorPosition();
      this.currentTrigger = this.atTrigger;
      if(this.suggestionBox != null) {
        this.suggestionBox.destroy();
      }
    }

    // Decide whether the close tag of the link trigger "]]" is triggered
    if(this.isTrigger(this.linkTrigger.close)) {
      if(this.suggestionBox != null) {
        this.suggestionBox.destroy();
      }
      this.currentTrigger = null;
    }
    this._decideTriggerActions();
  },

  /**
   * Switch to different actions according to the current
   * trigger context.
   * Notice : There might be some other triggers under link
   * trigger context, like,"attach:","@" and "."
   */
  _decideTriggerActions : function() {
    if(this.currentTrigger == null){
      return;
    }
    switch(this.currentTrigger.trigger) {
      case this.linkTrigger.trigger:
        this._actionLinkTriggered();
        break;
      case this.attachTrigger.trigger:
        this._actionAttachTriggered();
        break;
      case this.spaceTrigger.trigger:
        this._actionSpaceTriggered();
        break;
      case this.atTrigger.trigger:
        this._actionAtTriggered();
        break;
    }
  },

  /** Overwrite */
  continueSuggest : function() {
    if(this.currentTrigger != null) {
      return;
    }
    var currentPos = this.editor.getCursorPosition();
    var contextObj = this._getLinkContext(currentPos);
    if(contextObj.linkPos == -1) return;
    this.linkTrigger.pos = contextObj.linkPos;
    if(contextObj.atPos != -1) {
      this.atTrigger.pos = contextObj.atPos;
      this.currentTrigger = this.atTrigger;
    } else if(contextObj.spacePos != -1) {
      this.spaceTrigger.pos = contextObj.spacePos;
      this.currentTrigger = this.spaceTrigger;
    } else if(contextObj.attachPos != -1) {
      this.attachTrigger.pos = contextObj.attachPos;
      this.currentTrigger = this.attachTrigger;
    } else {
      this.currentTrigger = this.linkTrigger;
    }
    this._decideTriggerActions();
  },

  /**
   * Get the link context when user types shortcut
   * "ctrl+enter"
   */
  _getLinkContext : function(currentPos) {
    var strBefore = this.editor.getTextArea().value.substring(0, currentPos);
    var strAfter = this.editor.getTextArea().value.substring(currentPos, this.editor.getTextArea().value.length);
    var triggerPos = strBefore.lastIndexOf(this.linkTrigger.trigger);
    var triggerClosePos = strAfter.indexOf(this.linkTrigger.close);
    var strBetweenBefore =  this.editor.getTextArea().value.substring(triggerPos + this.linkTrigger.trigger.length, currentPos);
    var strBetweenAfter = this.editor.getTextArea().value.substring(currentPos, triggerClosePos + currentPos);
    if(triggerPos != -1) {
      if(strBetweenBefore.indexOf(this.linkTrigger.close) == -1) {
        var obj = {"linkPos":-1, "linkClosePos":-1, "labelPos":-1, "attachPos":-1, "spacePos":-1, "atPos":-1}
        var linkContent = strBetweenBefore;
        obj.linkPos = triggerPos + this.linkTrigger.trigger.length
        if(linkContent.indexOf(this.labelTrigger.trigger) != -1){
          obj.labelPos = linkContent.indexOf(this.labelTrigger.trigger) + obj.linkPos + this.labelTrigger.trigger.length;
        }
        if(linkContent.indexOf(this.attachTrigger.trigger) != -1){
          obj.attachPos = linkContent.indexOf(this.attachTrigger.trigger) + obj.linkPos + this.attachTrigger.trigger.length;
        } 
        if(linkContent.indexOf(this.spaceTrigger.trigger) != -1){
          obj.spacePos = linkContent.indexOf(this.spaceTrigger.trigger) + obj.linkPos + this.spaceTrigger.trigger.length;
        }
        if(linkContent.indexOf(this.atTrigger.trigger) != -1){
          obj.atPos = linkContent.indexOf(this.atTrigger.trigger) + obj.linkPos + this.atTrigger.trigger.length;
        }
        return obj;
      }
    }
  },
  
  _showSuggestionResults : function(requestUrl, query, position, size) {
    if(query == null || requestUrl == null || requestUrl == "") return;
    // The query for lucene search service can not be empty, or it will give no results.
    // So if the query is empty, we use "a" as the default query, which means to get the
    // pages or attachments start with "a";
    new Ajax.Request(requestUrl, {
      method : 'get',
      parameters : {"input":query},
      onSuccess : this._onSuccess.bind(this, position, size, query),
      onFailure : this._onFailure.bind(this)
    });
  },
  
  _onSuccess : function(position, size, query, response) { 
    var results= response.responseJSON
    var resultList = {"pages":[], "attachments":[]};
    if(results != null) {
      // Sort the results list in following orders(only for page name and attachment name):
      // Prior A : Prefix matched
      // Prior B : Partial matched
      // Prior C : characters;

      // Sort by characters
      results = results.sortBy(function(item){
        return item.name.toLowerCase();
      });

      // Sort by prefix matches;
      results = results.sortBy(function(item){
        var rank = 0;
	if(item.name.startsWith(query) && query != "") {
          rank = item.name.length - query.length;
        }
        return rank;
      });
      // Sort by space, the pages which belongs to the same space of the current edit page
      // will be ranked higher than others
      results = results.sortBy(function(item) {
        var rank = 10;
        var space = XWiki.resource.getSpaceFromResourceName(item.info);
        return space == XWiki.currentDocument.space ? 0 : 10;
      });
      
      for(var i=0; i < results.length; i++) {
        if(results[i].type == "wikipage" && resultList.pages.length < this.maxPagesViewNum){
          resultList.pages.push({"name":results[i].name, "path":results[i].path, "fullName":results[i].info, "type":"page"});
        }
        if(results[i].type == "attachment" && resultList.attachments.length < this.maxAttachmentsViewNum){
          resultList.attachments.push({"name":results[i].name, "path":results[i].path, "fullName":results[i].info, "type":"attachment"});
        }
      }
    }
    if(resultList.pages.length == 0) resultList.pages = null;
    if(resultList.attachments.length == 0) resultList.attachments = null;
    resultList = $H(resultList);
    if(this.suggestionBox == null || this.suggestionBox.isDestroyed()) {
      this.suggestionBox = new autosuggestion.LinkSuggestionBox(resultList, position, size, {"type":"wiki", "obj":this.editor.getTextArea()});
    }
    this.suggestionBox.showSuggestions(resultList, position, size);
  },
  
  _onFailure : function(response) {
    alert("suggestion failures");
  },

  /**  
   * Determin whether the current cursor position is in the context of the 
   * current link trigger.
   */
  _decideLinkContext : function() {
    return this.decideContext() && (this.linkTrigger.pos != -1)
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
    if(!this._decideLinkContext()) {
      this.currentTrigger = null;
      if(this.suggestionBox != null && !this.suggestionBox.isDestroyed()) {
        this.suggestionBox.destroy();
      }
      return;
    }
    this.editor.updateMask(this.linkTrigger);
    // Get the value user typed after the trigger as the query for suggestion
    var currentPos = this.editor.getCursorPosition();
    var contextValue = this.editor.getTextArea().value.substring(this.linkTrigger.pos, currentPos);
    var labelPos = contextValue.indexOf(this.labelTrigger.trigger);
    if(labelPos == -1) {
      var query = this.getQuery(this.linkTrigger.pos, currentPos);
    } else {
      var query = this.getQuery(this.linkTrigger.pos + this.labelTrigger.trigger.length + labelPos, currentPos);
    }
    if(query == "") {
      var requestUrl = new XWiki.Document('Recently Modified', 'Panels').getURL('get', 'xpage=plain&outputSyntax=plain&nb='+this.maxResultNum+'&media=json');      
    } else {
      var requestUrl = new XWiki.Document('SuggestLuceneService', 'XWiki').getURL('get', 'outputSyntax=plain&query='+encodeURIComponent('(name:__INPUT__* AND type:wikipage) OR (filename:__INPUT__* AND type:attachment)')+'&nb='+this.maxResultNum+'&media=json');
    }
    // Show the suggestion box for suggestion results.
    this.showSuggestions(requestUrl, query);
  },

  _actionAttachTriggered : function() {
    if(!this._decideLinkContext()) {
      this.currentTrigger = null;
      if(this.suggestionBox != null && !this.suggestionBox.isDestroyed()) {
        this.suggestionBox.destroy();
      }
      return;
    }
    this.editor.updateMask(this.attachTrigger);
    // Get the value user typed after the trigger as the query for suggestion
    var currentPos = this.editor.getCursorPosition();
    var query = this.getQuery(this.attachTrigger.pos, currentPos);
    if(query == ""){
      var requestUrl = new XWiki.Document('Recently Modified', 'Panels').getURL('get', 'xpage=plain&outputSyntax=plain&type=attachment&nb='+this.maxResultNum+'&media=json');   
    } else {
      var requestUrl = new XWiki.Document('SuggestLuceneService', 'XWiki').getURL('get', 'outputSyntax=plain&query='+encodeURIComponent('filename:__INPUT__* AND type:attachment')+'&nb='+this.maxResultNum+'&media=json');
    }
    // Show the suggestion box for suggestion results.
    this.showSuggestions(requestUrl, query);
  },

  _actionSpaceTriggered : function() {
    if(!this._decideLinkContext()) {
      this.currentTrigger = null;
      if(this.suggestionBox != null && !this.suggestionBox.isDestroyed()) {
        this.suggestionBox.destroy();
      }
      return;
    }
    this.editor.updateMask(this.spaceTrigger);
    // Get the value user typed after the trigger as the query for suggestion
    var currentPos = this.editor.getCursorPosition();
    var query = this.getQuery(this.spaceTrigger.pos, currentPos);
    var contextValue = this.editor.getTextArea().value.substring(this.linkTrigger.pos, currentPos);
    // Consider getting the page or attachment suggestions according whether the space trigger is in the context of attachmengt trigger.
    if(contextValue.indexOf(this.attachTrigger.trigger) == -1){
      // Consider getting the 'space' according whether the space trigger is in the context of labelTrigger ">>", 
      if(contextValue.indexOf(this.labelTrigger.trigger) == -1) {
        var space = this.editor.getTextArea().value.substring(this.linkTrigger.pos, this.spaceTrigger.pos-1);
      } else {
        var labelTriggerPos = contextValue.indexOf(this.labelTrigger.trigger) + this.labelTrigger.trigger.length + this.linkTrigger.pos;
        var space = this.editor.getTextArea().value.substring(labelTriggerPos, this.spaceTrigger.pos-1);
      }
      if(query == ""){
        var requestUrl = new XWiki.Document('Recently Modified', 'Panels').getURL('get', 'xpage=plain&outputSyntax=plain&type=wikipage&space='+encodeURIComponent(space)+'&nb='+this.maxResultNum+'&media=json');
      } else {
        var requestUrl = new XWiki.Document('SuggestLuceneService', 'XWiki').getURL('get', 'outputSyntax=plain&query='+encodeURIComponent('space:'+space+' AND name:__INPUT__* AND type:wikipage')+'&nb='+this.maxResultNum+'&media=json');
      }    
    } else {
      var attachPos = contextValue.indexOf(this.attachTrigger.trigger) + this.attachTrigger.trigger.length + this.linkTrigger.pos
      var space = this.editor.getTextArea().value.substring(attachPos, this.spaceTrigger.pos-1);
      if(query == ""){
        var requestUrl = new XWiki.Document('Recently Modified', 'Panels').getURL('get', 'xpage=plain&outputSyntax=plain&type=attachment&space='+encodeURIComponent(space)+'&nb='+this.maxResultNum+'&media=json');
      } else {
        var requestUrl = new XWiki.Document('SuggestLuceneService', 'XWiki').getURL('get', 'outputSyntax=plain&query='+encodeURIComponent('space:'+space+' AND filename:__INPUT__* AND type:attachment')+'&nb='+this.maxResultNum+'&media=json');
      }
    }
    // Show the suggestion box for suggestion results.
    this.showSuggestions(requestUrl, query);
  },

  _actionAtTriggered : function() {
    if(!this._decideLinkContext()) {
      this.currentTrigger = null;
      if(this.suggestionBox != null && !this.suggestionBox.isDestroyed()) {
        this.suggestionBox.destroy();
      }
      return;
    }
    this.editor.updateMask(this.atTrigger);
    // Get the value user typed after the trigger as the query for suggestion
    var currentPos = this.editor.getCursorPosition();
    var query = this.getQuery(this.atTrigger.pos, currentPos);
    var contextValue = this.editor.getTextArea().value.substring(this.linkTrigger.pos, currentPos);
    // The suggestion will be retreved only when "@" trigger is in the context of the attachmeng trigger.
    if(contextValue.indexOf(this.attachTrigger.trigger) != -1){
      var attachPos = contextValue.indexOf(this.attachTrigger.trigger) + this.linkTrigger.pos + this.attachTrigger.trigger.length;
      var space = null;
      // Consider getting different space according whether the at trigger is under the context of the space trigger.
      if(contextValue.indexOf(this.spaceTrigger.trigger) != -1){
        var spacePos = contextValue.indexOf(this.spaceTrigger.trigger) + this.linkTrigger.pos + this.spaceTrigger.trigger.length;
        var space = this.editor.getTextArea().value.substring(attachPos, spacePos-1);
        var wikipage = this.editor.getTextArea().value.substring(spacePos, this.atTrigger.pos-1); 
        if(query == ""){
          var requestUrl = new XWiki.Document('Recently Modified', 'Panels').getURL('get', 'xpage=plain&outputSyntax=plain&type=attachment&space='+encodeURIComponent(space)+'&name='+encodeURIComponent(wikipage)+'&nb='+this.maxResultNum+'&media=json');
        } else {
          var requestUrl = new XWiki.Document('SuggestLuceneService', 'XWiki').getURL('get', 'outputSyntax=plain&query='+encodeURIComponent('space:'+space+' AND name:'+wikipage+' AND filename:__INPUT__* AND type:attachment')+'&nb='+this.maxResultNum+'&media=json');
        }
      } else {
        var wikipage = this.editor.getTextArea().value.substring(this.attachTrigger.pos, this.atTrigger.pos-1);
        if(query == ""){
          var requestUrl = new XWiki.Document('Recently Modified', 'Panels').getURL('get', 'xpage=plain&outputSyntax=plain&type=attachment&name='+encodeURIComponent(wikipage)+'&nb='+this.maxResultNum+'&media=json');
        } else {
          var requestUrl = new XWiki.Document('SuggestLuceneService', 'XWiki').getURL('get', 'outputSyntax=plain&query='+encodeURIComponent('name:'+wikipage+' AND filename:__INPUT__* AND type:attachment')+'&nb='+this.maxResultNum+'&media=json'); 
        }
      }
      // Show the suggestion box for suggestion results.
      this.showSuggestions(requestUrl, query);
    } 
  },

  /**  
   * Complete link When user select item from link suggestion box. 
   */
  completeLinkSuggestor : function(item) {
    if(item == null) return;
    var labelText = "Label Text";
    var insertValue = this._getInsertValue(labelText, item);
    this.editor.insertText(insertValue, this.linkTrigger);
    // Highlight the label text, it is convenient for user to edit the label text
    this.editor.highlightText(this.linkTrigger.pos, labelText.length);
  },
 
  /**
   * Generate the relative link reference for link suggestions results.
   */ 
  _getInsertValue : function(labelText, item) {
    var insertValue = "";
    var relativeRef = item.fullName;
    var space = XWiki.resource.getSpaceFromResourceName(item.fullName);
    var pageName = XWiki.resource.getNameFromResourceName(item.fullName);
    if(space == XWiki.currentDocument.space){
      relativeRef = pageName;
    }
    if(item.type == "page") {
      insertValue = labelText + ">>" + relativeRef;
    } else if (item.type == "attachment") {
      if(relativeRef == XWiki.currentDocument.page){
        insertValue = labelText + ">>attach:" + item.name;
      } else {
        insertValue = labelText + ">>attach:" + relativeRef + "@" + item.name;
      }
    }
    return insertValue;
  }
});

/**  
 * The wrapper for wiki editors, there are many useful functions 
 * that add to the plain textArea object.
 */
autosuggestion.WikiEditor = Class.create({
  /** The textarea object of the wiki object */
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
      var range = this.textArea.createTextRange();
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
   * Highlight the text in the textarea from the start position @param position
   * and move @charLength characters;
   * @param position The start position of the text to hightlight;
   * @param charLength The character length to highlight; 
   */
  highlightText : function(position, charLength) {
    this.setCursorPosition(position);
    if(document.selection) {
      var range = this.textArea.createTextRange();
      range.move("character", position);
      for(var i=0; i < charLength; i++) {
        range.expand("character");
      }
      range.select();
    } else {
      this.textArea.setSelectionRange(this.textArea.selectionStart, this.textArea.selectionStart + charLength);
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
  
  insertText : function(value, trigger) { 
    var t =this.textArea;
    // Record the scrollTop of editor before inserting text
    var editorScrollTop = this.getScrollTop();
    var beforeTrigger = t.value.substring(0, trigger.pos);
    var afterTrigger = t.value.substring(this.getCursorPosition(), t.value.length);
    var replaceText = beforeTrigger + value + trigger.close + afterTrigger;
    this.textArea.value = replaceText;
    this.setCursorPosition((beforeTrigger + value + trigger.close).length);
    // Reset the scrollTop for the editor after inserting text
    t.scrollTop = editorScrollTop;
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
      "height": size.height + "px"
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
        document.fire("xwiki:autosuggestion:itemSelected", {"type":"link", "selectedValue":selectedValue});
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
      titleDiv.insert(obj.name);
      	  
      var fullNameDiv = new Element('div', {'class' : 'itemFullname'}); 
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
      titleDiv.insert(obj.name);

      var fullNameDiv = new Element('div', {'class' : 'itemFullname'});
      fullNameDiv.insert(obj.path);
	  
      attachmentDiv.appendChild(titleDiv);		
      attachmentDiv.appendChild(fullNameDiv);
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
    var results = null;
    if(this.pageItemValues == null) {
      results = this.attachmentItemValues;
    } else {
      results = this.pageItemValues.concat(this.attachmentItemValues);
    }
    document.fire("xwiki:autosuggestion:itemSelected", {"type":"link", "selectedValue":results[index]});
    this.destroy();// todo: this.destroy()
  },
  
  /** @Overwrite */
  keyNavigateHandler : function(index, itemList){
    var titleContainerHeight = $("suggestion_head").getHeight(); 
    var pageContainerHeight = $("suggestion_wikipage") == null ? 0 : $("suggestion_wikipage").getHeight();
    var attachmentContainerHeight = $("suggestion_attachment") == null ? 0 : $("suggestion_attachment").getHeight();
    var pageItemValuesLength = this.pageItemValues == null ? 0 : this.pageItemValues.length;
    var attachmentItemValuesLength = this.attachmentItemValues == null ? 0 : this.attachmentItemValues.length;
	
    var selectedItem = itemList[index];
    var relativeTop = selectedItem.positionedOffset().top - titleContainerHeight;	
	
    if(this.pageItemValues && index < pageItemValuesLength) {
      var scrollTop = $("suggestion_wikipage").scrollTop;
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
      relativeTop = relativeTop - pageContainerHeight;
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
    if(this.pageItemValues && index < this.pageItemValues.length) {
      return this.pageItemValues[index];
    } else {
      var offset = this.pageItemValues == null ? 0 : this.pageItemValues.length;
      return this.attachmentItemValues[index - offset];
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
    document.fire("xwiki:autosuggestion:itemSelected", {selectedValue:this.imageItemValues[index]});
    this.destroy();// todo: this.destroy()
  },

  /** @Overwrite */
  keyNavigateHandler : function(index, itemList){
    var titleContainerHeight = $("suggestion_head").getHeight();
    var imageContainerHeight = $("suggestion_images") == null ? 0 : $("suggestion_images").getHeight();
    var imageItemValuesLength = this.imageItemValues == null ? 0 : this.imageItemValues.length;

    var selectedItem = itemList[index];
    var relativeTop = selectedItem.positionedOffset().top - titleContainerHeight;

    if(this.imageItemValues && index < imageItemValuesLength) {
      var scrollTop = $("suggestion_images").scrollTop;
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

// Start the link suggestion functions.
document.observe('xwiki:dom:loaded', function() {
  var linkSuggestor = new XWiki.autosuggestion.LinkSuggestor("content");
  linkSuggestor.start();
});
