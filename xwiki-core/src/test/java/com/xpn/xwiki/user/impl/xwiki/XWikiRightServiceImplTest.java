/*
 * See the NOTICE file distributed with this work for additional
 * information regarding copyright ownership.
 *
 * This is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as
 * published by the Free Software Foundation; either version 2.1 of
 * the License, or (at your option) any later version.
 *
 * This software is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this software; if not, write to the Free
 * Software Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA
 * 02110-1301 USA, or see the FSF site: http://www.fsf.org.
 */
package com.xpn.xwiki.user.impl.xwiki;

import java.util.Collections;

import org.jmock.Mock;
import org.jmock.core.Invocation;
import org.jmock.core.stub.CustomStub;
import org.xwiki.model.reference.DocumentReference;

import com.xpn.xwiki.XWiki;
import com.xpn.xwiki.XWikiContext;
import com.xpn.xwiki.XWikiException;
import com.xpn.xwiki.doc.XWikiDocument;
import com.xpn.xwiki.objects.BaseObject;
import com.xpn.xwiki.test.AbstractBridgedXWikiComponentTestCase;
import com.xpn.xwiki.user.api.XWikiGroupService;
import com.xpn.xwiki.user.api.XWikiRightNotFoundException;
import com.xpn.xwiki.user.api.XWikiRightService;

/**
 * Unit tests for {@link com.xpn.xwiki.user.impl.xwiki.XWikiRightServiceImpl}.
 * 
 * @version $Id$
 */
public class XWikiRightServiceImplTest extends AbstractBridgedXWikiComponentTestCase
{
    private XWikiRightServiceImpl rightService;

    private Mock mockAuthService;

    private Mock mockXWiki;

    private XWikiDocument user;

    private XWikiDocument group;

    /**
     * {@inheritDoc}
     * 
     * @see junit.framework.TestCase#setUp()
     */
    @Override
    protected void setUp() throws Exception
    {
        super.setUp();
        this.rightService = new XWikiRightServiceImpl();

        this.mockAuthService = mock(XWikiGroupService.class, new Class[] {}, new Object[] {});

        this.mockXWiki = mock(XWiki.class);
        this.mockXWiki.stubs().method("isVirtualMode").will(returnValue(true));
        this.mockXWiki.stubs().method("getGroupService").will(returnValue(this.mockAuthService.proxy()));
        this.mockXWiki.stubs().method("isReadOnly").will(returnValue(false));
        this.mockXWiki.stubs().method("getWikiOwner").will(returnValue(null));
        this.mockXWiki.stubs().method("getMaxRecursiveSpaceChecks").will(returnValue(0));
        this.mockXWiki.stubs().method("getDocument").with(ANYTHING, eq("WebPreferences"), ANYTHING).will(
            new CustomStub("Implements XWiki.getDocument")
            {
                public Object invoke(Invocation invocation) throws Throwable
                {
                    return new XWikiDocument(new DocumentReference(getContext().getDatabase(),
                        (String) invocation.parameterValues.get(0), "WebPreferences"));
                }
            });

        getContext().setWiki((XWiki) this.mockXWiki.proxy());

        this.user = new XWikiDocument(new DocumentReference("wiki", "XWiki", "user"));
        BaseObject userObject = new BaseObject();
        userObject.setClassName("XWiki.XWikiUser");
        this.user.addXObject(userObject);
        this.mockXWiki.stubs().method("getDocument").with(eq(this.user.getPrefixedFullName()), ANYTHING).will(
            returnValue(this.user));

        this.group = new XWikiDocument(new DocumentReference("wiki", "XWiki", "group"));
        BaseObject groupObject = new BaseObject();
        groupObject.setClassName("XWiki.XWikiGroup");
        groupObject.setStringValue("member", "XWiki.user");
        this.group.addXObject(groupObject);
        this.mockXWiki.stubs().method("getDocument").with(eq(this.group.getPrefixedFullName()), ANYTHING).will(
            returnValue(this.group));

        this.mockAuthService.stubs().method("listGroupsForUser").with(eq(this.user.getPrefixedFullName()), ANYTHING)
            .will(returnValue(Collections.singleton(this.group.getFullName())));
        this.mockAuthService.stubs().method("listGroupsForUser").with(eq(this.user.getFullName()), ANYTHING).will(
            new CustomStub("Implements XWikiGroupService.listGroupsForUser")
            {
                public Object invoke(Invocation invocation) throws Throwable
                {
                    String member = (String) invocation.parameterValues.get(0);
                    XWikiContext context = (XWikiContext) invocation.parameterValues.get(1);

                    if (context.getDatabase().equals(user.getWikiName())) {
                        return Collections.singleton(group.getFullName());
                    } else {
                        return Collections.emptyList();
                    }
                }
            });

        this.mockAuthService.stubs().method("listGroupsForUser").with(eq(this.group.getPrefixedFullName()), ANYTHING)
            .will(returnValue(Collections.emptyList()));
        this.mockAuthService.stubs().method("listGroupsForUser").with(eq(this.group.getFullName()), ANYTHING).will(
            returnValue(Collections.emptyList()));
    }

    /**
     * Test if checkRight() take care of users's groups from other wikis.
     */
    public void testCheckRight() throws XWikiRightNotFoundException, XWikiException
    {
        final XWikiDocument doc = new XWikiDocument(new DocumentReference("wiki2", "Space", "Page"));

        Mock mockGlobalRightObj = mock(BaseObject.class, new Class[] {}, new Object[] {});
        mockGlobalRightObj.stubs().method("getStringValue").with(eq("levels")).will(returnValue("view"));
        mockGlobalRightObj.stubs().method("getStringValue").with(eq("groups")).will(
            returnValue(this.group.getPrefixedFullName()));
        mockGlobalRightObj.stubs().method("getStringValue").with(eq("users")).will(returnValue(""));
        mockGlobalRightObj.stubs().method("getIntValue").with(eq("allow")).will(returnValue(1));
        mockGlobalRightObj.stubs().method("setNumber");
        mockGlobalRightObj.stubs().method("setDocumentReference");

        doc.addObject("XWiki.XWikiGlobalRights", (BaseObject) mockGlobalRightObj.proxy());

        getContext().setDatabase("wiki2");

        boolean result =
            this.rightService.checkRight(this.user.getPrefixedFullName(), doc, "view", true, true, true, getContext());

        assertTrue(this.user.getPrefixedFullName() + "does not have global view right on wiki2", result);
    }

    public void testHasAccessLevelWhithUserFromAnotherWiki() throws XWikiException
    {
        final XWikiDocument doc = new XWikiDocument(new DocumentReference("wiki2", "Space", "Page"));

        final XWikiDocument preferences = new XWikiDocument(new DocumentReference("wiki2", "XWiki", "XWikiPreference"));
        BaseObject preferencesObject = new BaseObject();
        preferencesObject.setClassName("XWiki.XWikiGlobalRights");
        preferencesObject.setStringValue("levels", "view");
        preferencesObject.setIntValue("allow", 1);
        preferences.addXObject(preferencesObject);

        this.mockXWiki.stubs().method("getDocument").with(eq("XWiki.XWikiPreferences"), ANYTHING).will(
            new CustomStub("Implements XWiki.getDocument")
            {
                public Object invoke(Invocation invocation) throws Throwable
                {
                    if (!getContext().getDatabase().equals("wiki2")) {
                        new XWikiDocument(new DocumentReference(getContext().getDatabase(), "XWiki", "XWikiPreference"));
                    }

                    return preferences;
                }
            });
        this.mockXWiki.stubs().method("getDocument").with(eq(doc.getPrefixedFullName()), ANYTHING).will(
            returnValue(doc));

        getContext().setDatabase("wiki");

        assertFalse("User from another wiki has right on a local wiki", this.rightService.hasAccessLevel("view",
            this.user.getPrefixedFullName(), doc.getPrefixedFullName(), true, getContext()));

        // direct user rights

        preferencesObject.setStringValue("users", this.user.getPrefixedFullName());

        getContext().setDatabase(this.user.getWikiName());

        assertTrue("User from another wiki does not have right on a local wiki when tested from user wiki",
            this.rightService.hasAccessLevel("view", this.user.getPrefixedFullName(), doc.getPrefixedFullName(), true,
                getContext()));
        assertTrue("User from another wiki does not have right on a local wiki when tested from user wiki",
            this.rightService.hasAccessLevel("view", this.user.getFullName(), doc.getPrefixedFullName(), true,
                getContext()));

        getContext().setDatabase(doc.getWikiName());

        assertTrue("User from another wiki does not have right on a local wiki when tested from local wiki",
            this.rightService.hasAccessLevel("view", this.user.getPrefixedFullName(), doc.getPrefixedFullName(), true,
                getContext()));
        assertTrue("User from another wiki does not have right on a local wiki when tested from local wiki",
            this.rightService.hasAccessLevel("view", this.user.getPrefixedFullName(), doc.getFullName(), true,
                getContext()));

        // user group rights

        preferencesObject.removeField("users");
        preferencesObject.setStringValue("groups", this.group.getPrefixedFullName());

        getContext().setDatabase(this.user.getWikiName());

        assertTrue("User group from another wiki does not have right on a local wiki when tested from user wiki",
            this.rightService.hasAccessLevel("view", this.user.getPrefixedFullName(), doc.getPrefixedFullName(), true,
                getContext()));
        assertTrue("User group from another wiki does not have right on a local wiki when tested from user wiki",
            this.rightService.hasAccessLevel("view", this.user.getFullName(), doc.getPrefixedFullName(), true,
                getContext()));

        getContext().setDatabase(doc.getWikiName());

        assertTrue("User group from another wiki does not have right on a local wiki when tested from local wiki",
            this.rightService.hasAccessLevel("view", this.user.getPrefixedFullName(), doc.getPrefixedFullName(), true,
                getContext()));
        assertTrue("User group from another wiki does not have right on a local wiki when tested from local wiki",
            this.rightService.hasAccessLevel("view", this.user.getPrefixedFullName(), doc.getFullName(), true,
                getContext()));

        // user is wiki owner

        preferencesObject.removeField("groups");
        this.mockXWiki.stubs().method("getWikiOwner").with(eq(doc.getWikiName()), ANYTHING).will(
            returnValue(this.user.getPrefixedFullName()));

        getContext().setDatabase(this.user.getWikiName());

        assertTrue("Wiki owner from another wiki does not have right on a local wiki when tested from user wiki",
            this.rightService.hasAccessLevel("view", this.user.getPrefixedFullName(), doc.getPrefixedFullName(), true,
                getContext()));
        assertTrue("Wiki owner group from another wiki does not have right on a local wiki when tested from user wiki",
            this.rightService.hasAccessLevel("view", this.user.getFullName(), doc.getPrefixedFullName(), true,
                getContext()));

        getContext().setDatabase(doc.getWikiName());

        assertTrue(
            "Wiki owner group from another wiki does not have right on a local wiki when tested from local wiki",
            this.rightService.hasAccessLevel("view", this.user.getPrefixedFullName(), doc.getPrefixedFullName(), true,
                getContext()));
        assertTrue(
            "Wiki owner group from another wiki does not have right on a local wiki when tested from local wiki",
            this.rightService.hasAccessLevel("view", this.user.getPrefixedFullName(), doc.getFullName(), true,
                getContext()));
    }

    /**
     * Test that programming rights are checked on the context user when no context document is set.
     */
    public void testProgrammingRightsWhenNoContextDocumentIsSet()
    {
        // Setup an XWikiPreferences document granting programming rights to XWiki.Programmer
        XWikiDocument prefs = new XWikiDocument("XWiki", "XWikiPreferences");
        Mock mockGlobalRightObj = mock(BaseObject.class, new Class[] {}, new Object[] {});
        mockGlobalRightObj.stubs().method("getStringValue").with(eq("levels")).will(returnValue("programming,admin"));
        mockGlobalRightObj.stubs().method("getStringValue").with(eq("users")).will(returnValue("XWiki.Programmer"));
        mockGlobalRightObj.stubs().method("getIntValue").with(eq("allow")).will(returnValue(1));
        mockGlobalRightObj.stubs().method("setNumber");
        mockGlobalRightObj.stubs().method("setDocumentReference");
        prefs.addObject("XWiki.XWikiGlobalRights", (BaseObject) mockGlobalRightObj.proxy());
        this.mockXWiki.stubs().method("getDocument").with(eq("XWiki.XWikiPreferences"), eq(getContext())).will(
            returnValue(prefs));

        // Setup the context (no context document)
        this.mockXWiki.stubs().method("getDatabase").will(returnValue("xwiki"));
        getContext().remove("doc");
        getContext().remove("sdoc");

        // XWiki.Programmer should have PR, as per the global rights.
        getContext().setUser("XWiki.Programmer");
        assertTrue(this.rightService.hasProgrammingRights(getContext()));

        this.mockAuthService.stubs().method("listGroupsForUser").with(eq(XWikiRightService.GUEST_USER_FULLNAME),
            ANYTHING).will(returnValue(Collections.emptyList()));

        // Guests should not have PR
        getContext().setUser(XWikiRightService.GUEST_USER_FULLNAME);
        assertFalse(this.rightService.hasProgrammingRights(getContext()));

        // superadmin should always have PR
        getContext().setUser(XWikiRightService.SUPERADMIN_USER_FULLNAME);
        assertTrue(this.rightService.hasProgrammingRights(getContext()));
    }
}