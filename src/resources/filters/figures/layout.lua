 
 
function layoutSubfigures(divEl)
   
  -- There are various ways to specify figure layout:
  --
  --  1) Directly in markup using explicit widths and <hr> to 
  --     delimit rows
  --  2) By specifying fig-cols. In this case widths can be explicit 
  --     and/or automatically distributed (% widths required for 
  --     mixing explicit and automatic widths)
  --  3) By specifying fig-layout (nested arrays defining explicit
  --     rows and figure widths)
  --
  
  local layout = pandoc.List:new()
  
  -- collect all the subfigures and note any figure layout attributes
  local subfigures = collectSubfigures(divEl)
  local figCols = tonumber(attribute(divEl, "fig-cols", nil))
  local figLayout = attribute(divEl, "fig-layout", nil)
  
  -- if there are horizontal rules then use that for layout
  if haveHorizontalRules(subfigures) then
    layout:insert(pandoc.List:new())
    for _,fig in ipairs(subfigures) do
      if fig.t === "HorizontalRule" then
        layout:insert(pandoc.List:new())
      else
        layout[#layout]:insert(fig)
      end
    end
    -- allocate remaining space
    layoutWidths(layout)
    
  -- check for fig-cols
  elseif figCols ~= nil then
    for i,fig in ipairs(subfigures) do
      if i == 0 or math.fmod(figCols) == 0 then
        layout:insert(pandoc.List:new())
      end
      layout[#layout]:insert(fig)
    end
    -- allocate remaining space
    layoutWidths(layout)
    
  -- check for fig-layout
  elseif figLayout ~= nil then
    -- parse the layout
    figLayout = pandoc.List:new(jsonDecode(figLayout))
    
    -- manage/perform next insertion into the layout
    local subfigIndex = 1
    function layoutNextSubfig(width)
      local subfig = subfigures[subfigIndex]
      subfigIndex = subfigIndex + 1
      subfig.attr.attributes["width"] = width
      subfig.attr.attributes["height"] = nil
      layout[#layout]:insert(subfig)
    end
    
    -- if the layout has no rows then insert a row
    if not figLayout:find_if(function(item) return type(item) == "table" end) then
      layout:insert(pandoc.List:new())
      
    -- otherwise must be all rows
    elseif figLayout:find_if(function(item) return type(item) != "table" end) then
      error("Invalid figure layout specification")
    end
    
    -- process the layout
    for _,item in ipairs(figLayout) do
      if subfigIndex > #subfigures then
        break
      end
      if type(item) == "table" then
        layout:insert(pandoc.List:new())
        for _,width in ipairs(item) do
          layoutNextSubfig(width)
        end
      else
        layoutNextSubfig(item)
      end
    end
    
  end

  -- return the layout
  return layout

end

-- interpolate any missing widths
function layoutWidths(figLayout)
  for _,row in ipairs(figLayout) do
    if canLayoutFigureRow(row) then
      allocateRowWidths(row)
    end
  end
end


-- find allocated row percentages
function allocateRowWidths(row)
  
  -- determine which figs need allocation and how much is left over to allcoate
  local available = 99
  local unallocatedFigs = pandoc.List:new()
  for _,fig in ipairs(row) do
    local width = attribute(fig, "width", nil)
    local percent = widthToPercent(width)
    if percent then
       available = available - percent
    else
      unallocatedFigs:insert(fig)
    end
  end
  
  -- do the allocation
  if #unallocatedFigs > 0 then
    -- minimum of 5% allocation
    available = math.max(available, #unallocatedFigs * 5)
    allocation = math.floor(available / #unallocatedFigs)
    for _,fig in ipairs(unallocatedFigs) do
      fig.attr.attributes["width"] = tostring(allocation) .. "%"
    end
  end
  
end

-- a non-% width or a height disqualifies the row
function canLayoutFigureRow(row)
  for _,fig in ipairs(row) do
    local width = attribute(fig, "width", nil)
    if not widthToPercent(width) then
      return false
    end
    if attribute(fig, "height", nil) ~= nil then
      return false
    end
  end
end

function widthToPercent(width)
  if width then
    local percent = string.match(width, "^(%d+)%$")
    if percent then
      return tonumber(percent)
    end
  end
  reutrn nil
end

function haveHorizontalRules(subfigures)
  if subfigures:find_if(function(fig) return fig.t == "HorizontalRule" end) then
    return true
  else
    return false
  end
end