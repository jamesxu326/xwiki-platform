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
package org.xwiki.rendering.internal.macro.wikibridge;

import org.jmock.Expectations;
import org.jmock.Mockery;
import org.junit.*;
import org.xwiki.bridge.DocumentAccessBridge;
import org.xwiki.model.reference.DocumentReference;
import org.xwiki.component.descriptor.DefaultComponentDescriptor;
import org.xwiki.context.Execution;
import org.xwiki.rendering.converter.Converter;
import org.xwiki.rendering.macro.descriptor.DefaultContentDescriptor;
import org.xwiki.rendering.macro.wikibridge.WikiMacroDescriptor;
import org.xwiki.rendering.macro.wikibridge.WikiMacroManager;
import org.xwiki.rendering.macro.wikibridge.WikiMacroParameterDescriptor;
import org.xwiki.rendering.macro.wikibridge.WikiMacroVisibility;
import org.xwiki.rendering.renderer.printer.DefaultWikiPrinter;
import org.xwiki.rendering.syntax.Syntax;
import org.xwiki.test.AbstractComponentTestCase;

import java.io.StringReader;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;

/**
 * Unit tests for {@link DefaultWikiMacro}.
 *
 * @version $Id$
 * @since 2.2M1
 */
public class DefaultWikiMacroTest extends AbstractComponentTestCase
{
    private Mockery mockery = new Mockery();

    private DocumentAccessBridge mockDocumentAccessBridge;

    private DocumentReference wikiMacroDocumentReference;

    /**
     * The {@link org.xwiki.rendering.macro.wikibridge.WikiMacroManager} component.
     */
    private WikiMacroManager wikiMacroManager;

    @Before
    public void setUp() throws Exception
    {
        super.setUp();

        // Document Access Bridge Mock
        this.mockDocumentAccessBridge = mockery.mock(DocumentAccessBridge.class);
        DefaultComponentDescriptor<DocumentAccessBridge> descriptorDAB =
            new DefaultComponentDescriptor<DocumentAccessBridge>();
        descriptorDAB.setRole(DocumentAccessBridge.class);
        getComponentManager().registerComponent(descriptorDAB, this.mockDocumentAccessBridge);

        this.wikiMacroDocumentReference = new DocumentReference("wiki", "space", "macroPage");

        mockery.checking(new Expectations() {{
            allowing(mockDocumentAccessBridge).getCurrentWiki(); will(returnValue("wiki"));
            allowing(mockDocumentAccessBridge).getCurrentUser(); will(returnValue("dummy"));
            allowing(mockDocumentAccessBridge).hasProgrammingRights(); will(returnValue(true));

            // This is the document containing the wiki macro that will be put in the context available in the macro
            // Since we're not testing it here, it can be null.
            allowing(mockDocumentAccessBridge).getDocument(wikiMacroDocumentReference); will(returnValue(null));
        }});

        this.wikiMacroManager = getComponentManager().lookup(WikiMacroManager.class);

        // Make sure the old XWiki Context is set up in the Execution Context since it's used in
        // DefaultWikiMacro.execute().
        Execution execution = getComponentManager().lookup(Execution.class);
        execution.getContext().setProperty("xwikicontext", new HashMap<String, Object>());
    }

    @org.junit.Test
    public void testExecute() throws Exception
    {
        registerWikiMacro("wikimacro1", "This is **bold**");

        Converter converter = getComponentManager().lookup(Converter.class);

        DefaultWikiPrinter printer = new DefaultWikiPrinter();
        converter.convert(new StringReader("{{wikimacro1 param1=\"value1\" param2=\"value2\"/}}"),
            Syntax.XWIKI_2_0, Syntax.XHTML_1_0, printer);

        // Note: We're using XHTML as the output syntax just to make it easy for asserting.
        Assert.assertEquals("<p>This is <strong>bold</strong></p>", printer.toString());
    }

    /**
     * When a wiki macro is used in inline mode and its code starts with a macro, that nested macro is made inline.
     * In other words, the nested macro should not generate extra paragraph elements.
     */
    @org.junit.Test
    public void testExecuteWhenInlineAndWithMacro() throws Exception
    {
        registerWikiMacro("wikimacro1", "This is **bold**");
        registerWikiMacro("wikimacro2", "{{wikimacro1 param1=\"v1\" param2=\"v2\"/}}");

        Converter converter = getComponentManager().lookup(Converter.class);

        DefaultWikiPrinter printer = new DefaultWikiPrinter();
        // Note: We're putting the macro after the "Hello" text to force it as an inline macro.
        converter.convert(new StringReader("Hello {{wikimacro2 param1=\"value1\" param2=\"value2\"/}}"),
            Syntax.XWIKI_2_0, Syntax.XHTML_1_0, printer);

        // Note: We're using XHTML as the output syntax just to make it easy for asserting.
        Assert.assertEquals("<p>Hello This is <strong>bold</strong></p>", printer.toString());
    }

    private void registerWikiMacro(String macroId, String macroContent) throws Exception
    {
        List<WikiMacroParameterDescriptor> parameterDescriptors = Arrays.asList(
            new WikiMacroParameterDescriptor("param1", "This is param1", true),
            new WikiMacroParameterDescriptor("param2", "This is param2", true));
        WikiMacroDescriptor descriptor = new WikiMacroDescriptor("Wiki Macro", "Description", "Test",
            WikiMacroVisibility.GLOBAL, new DefaultContentDescriptor(false), parameterDescriptors);

        DefaultWikiMacro wikiMacro = new DefaultWikiMacro(wikiMacroDocumentReference, macroId, true, descriptor,
            macroContent, "xwiki/2.0", getComponentManager());

        wikiMacroManager.registerWikiMacro(wikiMacroDocumentReference, wikiMacro);
    }
}