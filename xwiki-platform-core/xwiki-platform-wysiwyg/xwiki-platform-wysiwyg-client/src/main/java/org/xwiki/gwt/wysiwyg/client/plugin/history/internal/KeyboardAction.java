package org.xwiki.gwt.wysiwyg.client.plugin.history.internal;

import com.google.gwt.event.dom.client.KeyCodes;

/**
 * Types of action the user can do with its keyboard.
 * 
 * @version $Id$
 */
public enum KeyboardAction
{
    /**
     * The user writes text.
     */
    INSERT_WORD(new char[] {}),
    /**
     * The user deletes text.
     */
    DELETE(new char[] {KeyCodes.KEY_BACKSPACE, KeyCodes.KEY_DELETE}),
    /**
     * The user inserts in-line white space.
     */
    INSERT_SPACE(new char[] {' ', KeyCodes.KEY_TAB}),
    /**
     * The user inserts a new line.
     */
    INSERT_NEW_LINE(new char[] {KeyCodes.KEY_ENTER}),
    /**
     * The user navigates through the text.
     */
    MOVE_CARET(new char[] {KeyCodes.KEY_DOWN, KeyCodes.KEY_END, KeyCodes.KEY_HOME, KeyCodes.KEY_LEFT,
        KeyCodes.KEY_PAGEDOWN, KeyCodes.KEY_PAGEUP, KeyCodes.KEY_RIGHT, KeyCodes.KEY_UP});

    /**
     * The key codes associated with this keyboard action.
     */
    private final char[] keyCodes;

    /**
     * @param keyCodes The key codes associated with the keyboard action being created.
     */
    private KeyboardAction(char[] keyCodes)
    {
        this.keyCodes = keyCodes;
    }

    /**
     * @param keyCode the code of the key pressed.
     * @return true if this keyboard action matches the pressed keys.
     */
    private boolean matches(int keyCode)
    {
        for (char attachedKeyCode : keyCodes) {
            if (keyCode == attachedKeyCode) {
                return true;
            }
        }
        return false;
    }

    /**
     * Iterates through all the keyboard actions in search for one matching the given key code and modifiers. if none is
     * found then {@link #INSERT_WORD} is returned.
     * 
     * @param keyCode the code of the key pressed.
     * @return the keyboard action associated with the specified key code and modifiers.
     */
    public static KeyboardAction valueOf(int keyCode)
    {
        for (KeyboardAction action : KeyboardAction.values()) {
            if (action.matches(keyCode)) {
                return action;
            }
        }
        return KeyboardAction.INSERT_WORD;
    }
}
