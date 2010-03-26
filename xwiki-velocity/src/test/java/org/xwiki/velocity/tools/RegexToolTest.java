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
package org.xwiki.velocity.tools;

import java.util.List;

import org.junit.Assert;
import org.junit.Test;
import org.xwiki.velocity.tools.RegexTool.RegexResult;

/**
 * Unit tests for {@link RegexTool}.
 *  
 * @version $Id$
 * @since 2.0RC1
 */
public class RegexToolTest
{
    @Test
    public void testFind()
    {
        RegexTool tool = new RegexTool();
        List<RegexResult> result = 
            tool.find("<h1><span>header</span></h1> whatever", "<[hH][12].*?><span>(.*?)</span></[hH][12]>");
        
        Assert.assertEquals(2, result.size());
        Assert.assertEquals("<h1><span>header</span></h1>", result.get(0).getGroup());
        Assert.assertEquals("header", result.get(1).getGroup());
    }
}