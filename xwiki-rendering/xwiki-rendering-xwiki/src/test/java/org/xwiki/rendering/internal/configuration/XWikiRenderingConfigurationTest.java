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
package org.xwiki.rendering.internal.configuration;

import org.xwiki.component.annotation.Component;
import org.xwiki.rendering.scaffolding.AbstractXWikiRenderingTestCase;
import org.xwiki.rendering.configuration.RenderingConfiguration;
import org.junit.Assert;
import org.junit.Test;

/**
 * Unit tests for {@link org.xwiki.rendering.internal.configuration.XWikiRenderingConfiguration}.
 * 
 * @version $Id$
 * @since 2.0M1
 */
@Component
public class XWikiRenderingConfigurationTest extends AbstractXWikiRenderingTestCase
{
    @Test
    public void testDefaultConfiguration() throws Exception
    {
        RenderingConfiguration configuration = getComponentManager().lookup(RenderingConfiguration.class);
        Assert.assertEquals("%p", configuration.getLinkLabelFormat());
        Assert.assertNotNull(configuration.getMacroCategories());
        Assert.assertEquals(0, configuration.getMacroCategories().size());
    }
}