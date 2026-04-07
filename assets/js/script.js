document.addEventListener("DOMContentLoaded", async () => {
  const canvas = document.getElementById("cardCanvas");
  const context = canvas.getContext("2d");
  const moveTextToggle = document.getElementById("inpLock");
  const recipientInput = document.getElementById("recipientInput");
  const messageInput = document.getElementById("messageInput");
  const fontSelect = document.getElementById("fontSelect");
  const colorInput = document.getElementById("colorInput");
  const boldToggle = document.getElementById("boldToggle");
  const italicToggle = document.getElementById("italicToggle");
  const fontSizeInput = document.getElementById("fontSizeInput");
  const fontSizeValue = document.getElementById("fontSizeValue");
  const availableCardCount = document.getElementById("availableCardCount");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const shareBtn = document.getElementById("shareBtn");
  const resetBtn = document.getElementById("resetBtn");
  const statusMessage = document.getElementById("statusMessage");
  const activeTemplateLabel = document.getElementById("activeTemplateLabel");
  const templateWheel = document.getElementById("templateGrid");
  const giftFlipCard = document.querySelector(".gift-flip-card");
  let templateButtons = [];

  const fontMap = {
    trebuchet: '"Trebuchet MS", Arial, sans-serif',
    georgia: 'Georgia, "Times New Roman", serif',
    palatino: '"Palatino Linotype", "Book Antiqua", serif',
    inter: '"Inter", "Segoe UI", Arial, sans-serif',
    poppins: '"Poppins", "Segoe UI", Arial, sans-serif',
    merriweather: '"Merriweather", Georgia, serif',
    "bangla-ui": '"Nirmala UI", "Hind Siliguri", "Segoe UI", sans-serif',
    "hind-siliguri": '"Hind Siliguri", "Nirmala UI", sans-serif',
    "noto-bengali-serif": '"Noto Serif Bengali", Georgia, serif',
    "baloo-bangla": '"Baloo Da 2", "Hind Siliguri", sans-serif'
  };

  const templateStylePresets = {
    template1: { titleColor: "#2f7d6c" },
    template2: { titleColor: "#005bd3" },
    template3: { titleColor: "#2f7d6c" },
    template14: { titleColor: "#2f7d6c" },
    template34: { titleColor: "#f8fbff" }
  };
  const templateConfigs = [
    { id: "template1", name: "Card 1", src: "assets/img/template1.svg" },
    { id: "template2", name: "Card 2", src: "assets/img/template2.svg" },
    { id: "template3", name: "Card 3", src: "assets/img/template3.svg" },
    { id: "template14", name: "Card 4", src: "assets/img/template14.svg" },
    { id: "template34", name: "Card 5", src: "assets/img/template34.svg" }
  ].map((template, index) => createTemplateConfig(template, index));

  const defaults = {
    templateIndex: 0,
    recipient: "",
    message: "আপনার ও আপনার পরিবারের জন্য রইল শান্তি, আনন্দ আর অফুরন্ত দোয়ার শুভেচ্ছা।",
    fontId: "bangla-ui",
    color: "#ffffff",
    scale: 100,
    isBold: false,
    isItalic: false,
    textX: 0.5,
    textY: 0.67
  };

  const state = { ...defaults };
  const loadedTemplates = [];
  let customColorTouched = false;
  let dragStartX = null;
  let renderFrame = null;
  let textBounds = null;
  let draggingText = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  function setStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.style.color = isError ? "#c54545" : "";
  }

  function isEditModeEnabled() {
    return Boolean(moveTextToggle && moveTextToggle.checked);
  }

  function getTemplatePreset(templateId) {
    return {
      titleColor: "#2f7d6c",
      width: 1500,
      height: 2400,
      ...(templateStylePresets[templateId] || {})
    };
  }

  function getTemplateSrc(templateId, fallbackSrc) {
    if (window.TEMPLATE_DATA && window.TEMPLATE_DATA[templateId]) {
      return window.TEMPLATE_DATA[templateId];
    }

    return fallbackSrc;
  }

  function createTemplateConfig(template, index) {
    const preset = getTemplatePreset(template.id);

    return {
      id: template.id,
      name: template.name || `Card ${index + 1}`,
      src: getTemplateSrc(template.id, template.src),
      titleColor: template.titleColor || preset.titleColor,
      width: template.width || preset.width,
      height: template.height || preset.height,
      previewSrc: template.src
    };
  }

  function buildTemplateWheel() {
    templateWheel.innerHTML = templateConfigs.map((template, index) => `
      <button class="template-thumb${index === state.templateIndex ? " is-active" : ""}" type="button" data-template-index="${index}" aria-label="Select ${template.name}">
        <span class="thumb-media">
          <img src="${template.previewSrc || template.src}" alt="${template.name} preview">
        </span>
        <span class="wheel-label">${template.name}</span>
      </button>
    `).join("");

    templateButtons = Array.from(templateWheel.querySelectorAll(".template-thumb"));
  }

  function clampTemplateIndex(value) {
    if (!Number.isInteger(value)) {
      return defaults.templateIndex;
    }

    if (value < 0) {
      return 0;
    }

    if (value >= templateConfigs.length) {
      return templateConfigs.length - 1;
    }

    return value;
  }

  function loadStateFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const templateIndex = Number.parseInt(params.get("template"), 10);
    const color = params.get("color");
    const scale = Number.parseInt(params.get("size"), 10);
    const fontId = params.get("font");
    const textX = Number.parseFloat(params.get("x"));
    const textY = Number.parseFloat(params.get("y"));
    const isBold = params.get("bold");
    const isItalic = params.get("italic");

    state.templateIndex = clampTemplateIndex(templateIndex);
    state.recipient = params.get("to") || defaults.recipient;
    state.message = params.get("message") || defaults.message;
    state.fontId = fontId && fontMap[fontId] ? fontId : defaults.fontId;
    state.color = /^#[0-9a-f]{6}$/i.test(`#${(color || "").replace("#", "")}`)
      ? `#${color.replace("#", "")}`
      : defaults.color;
    state.scale = Number.isFinite(scale) ? Math.min(Math.max(scale, 75), 135) : defaults.scale;
    state.isBold = isBold === "1";
    state.isItalic = isItalic === "1";
    state.textX = Number.isFinite(textX) ? Math.min(Math.max(textX, 0.16), 0.84) : defaults.textX;
    state.textY = Number.isFinite(textY) ? Math.min(Math.max(textY, 0.12), 0.84) : defaults.textY;
    customColorTouched = Boolean(color);
  }

  function syncStyleToggleState() {
    [
      [boldToggle, state.isBold],
      [italicToggle, state.isItalic]
    ].forEach(([button, isActive]) => {
      if (!button) {
        return;
      }

      button.setAttribute("aria-pressed", String(isActive));
      button.classList.toggle("is-active", isActive);
    });
  }

  function syncInputsFromState() {
    recipientInput.value = state.recipient;
    messageInput.value = state.message;
    fontSelect.value = state.fontId;
    colorInput.value = state.color;
    fontSizeInput.value = String(state.scale);
    fontSizeValue.textContent = `${state.scale}%`;
    syncStyleToggleState();
  }

  function syncStateToUrl() {
    const params = new URLSearchParams();

    params.set("template", String(state.templateIndex));

    if (state.recipient.trim()) {
      params.set("to", state.recipient.trim());
    }

    if (state.message.trim()) {
      params.set("message", state.message.trim());
    }

    params.set("font", state.fontId);
    params.set("color", state.color.replace("#", ""));
    params.set("size", String(state.scale));
    params.set("bold", state.isBold ? "1" : "0");
    params.set("italic", state.isItalic ? "1" : "0");
    params.set("x", state.textX.toFixed(3));
    params.set("y", state.textY.toFixed(3));

    const nextUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", nextUrl);
  }

  function updateTemplateUI() {
    const wheelWidth = templateWheel.clientWidth || 900;
    const buttonWidth = templateButtons[0]?.offsetWidth || 160;
    const templateCount = templateButtons.length || 1;
    const maxDistance = Math.max(1, Math.floor(templateCount / 2));
    const usableHalfWidth = Math.max((wheelWidth / 2) - (buttonWidth / 2) - 18, 80);
    const horizontalStep = Math.min(134, usableHalfWidth / maxDistance);

    templateButtons.forEach((button, buttonIndex) => {
      let relativeIndex = buttonIndex - state.templateIndex;

      if (relativeIndex > templateCount / 2) {
        relativeIndex -= templateCount;
      } else if (relativeIndex < -templateCount / 2) {
        relativeIndex += templateCount;
      }

      const absOffset = Math.abs(relativeIndex);
      const isActive = relativeIndex === 0;
      const translateX = relativeIndex * horizontalStep;
      const translateY = 18 + (absOffset * 10);
      const scale = Math.max(1 - (absOffset * 0.11), 0.56);
      const opacity = 1;
      const saturation = 1;
      const blur = 0;

      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
      button.style.transform = `translateX(calc(-50% + ${translateX}px)) translateY(calc(-50% + ${translateY}px)) scale(${scale})`;
      button.style.opacity = String(opacity);
      button.style.zIndex = String(200 - absOffset);
      button.style.filter = `saturate(${saturation}) blur(${blur}px)`;
    });

    availableCardCount.textContent = `${templateConfigs.length} cards`;
    activeTemplateLabel.textContent = templateConfigs[state.templateIndex]?.name || "Card 1";
  }

  function wrapTextByWidth(text, maxWidth) {
    const words = text.trim().split(/\s+/).filter(Boolean);

    if (!words.length) {
      return [];
    }

    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i += 1) {
      const candidate = `${currentLine} ${words[i]}`;

      if (context.measureText(candidate).width <= maxWidth) {
        currentLine = candidate;
      } else {
        lines.push(currentLine);
        currentLine = words[i];
      }
    }

    lines.push(currentLine);
    return lines;
  }

  function fitFontSize(text, baseSize, maxWidth, fontStyle, weight, family) {
    let size = baseSize;

    context.font = `${fontStyle} ${weight} ${size}px ${family}`;

    while (size > 52 && context.measureText(text).width > maxWidth) {
      size -= 4;
      context.font = `${fontStyle} ${weight} ${size}px ${family}`;
    }

    return size;
  }

  function fitBodyLayout(text, startingSize, maxWidth, fontStyle, weight, family) {
    let size = startingSize;
    let lines = [];

    while (size > 34) {
      context.font = `${fontStyle} ${weight} ${size}px ${family}`;
      lines = wrapTextByWidth(text, maxWidth);

      if (lines.length <= 4) {
        return {
          size,
          lines
        };
      }

      size -= 3;
    }

    return {
      size,
      lines
    };
  }

  function drawTextBlock() {
    const template = loadedTemplates[state.templateIndex];
    const fontFamily = fontMap[state.fontId];
    const scaleFactor = state.scale / 100;
    const fontStyle = state.isItalic ? "italic" : "normal";
    const titleWeight = state.isBold ? "700" : "600";
    const bodyWeight = state.isBold ? "600" : "500";
    const headline = state.recipient.trim()
      ? `ঈদ মোবারক ${state.recipient.trim()}`
      : "ঈদ মোবারক";
    const body = state.message.trim() || defaults.message;
    const safeWidth = canvas.width * 0.72;
    const centerX = canvas.width * state.textX;
    const blockTop = canvas.height * state.textY;
    const titleBaseSize = 118 * scaleFactor;
    const titleSize = fitFontSize(headline, titleBaseSize, safeWidth, fontStyle, titleWeight, fontFamily);
    const fittedBody = fitBodyLayout(body, 62 * scaleFactor, safeWidth, fontStyle, bodyWeight, fontFamily);
    const bodyBaseSize = fittedBody.size;
    const bodyLines = fittedBody.lines;
    const bodyLineHeight = bodyBaseSize * 1.35;
    const measuredWidths = [];

    context.textAlign = "center";
    context.textBaseline = "top";
    context.lineJoin = "round";
    context.shadowColor = "rgba(0, 0, 0, 0.25)";
    context.shadowBlur = 28;
    context.shadowOffsetY = 8;

    context.fillStyle = state.color || template.titleColor;
    context.strokeStyle = "rgba(0, 0, 0, 0.18)";
    context.lineWidth = Math.max(6, titleSize * 0.06);
    context.font = `${fontStyle} ${titleWeight} ${titleSize}px ${fontFamily}`;
    measuredWidths.push(context.measureText(headline).width);
    context.strokeText(headline, centerX, blockTop);
    context.fillText(headline, centerX, blockTop);

    context.font = `${fontStyle} ${bodyWeight} ${bodyBaseSize}px ${fontFamily}`;
    context.lineWidth = Math.max(4, bodyBaseSize * 0.05);

    const bodyStartY = blockTop + titleSize + 56;
    bodyLines.forEach((line, lineIndex) => {
      const lineY = bodyStartY + bodyLineHeight * lineIndex;
      measuredWidths.push(context.measureText(line).width);

      context.strokeText(line, centerX, lineY);
      context.fillText(line, centerX, lineY);
    });

    context.shadowColor = "transparent";
    context.shadowBlur = 0;
    context.shadowOffsetY = 0;

    const widestLine = Math.max(...measuredWidths, 0);
    const blockHeight = titleSize + 56 + Math.max(bodyLines.length, 1) * bodyLineHeight;
    textBounds = {
      left: centerX - widestLine / 2 - 28,
      right: centerX + widestLine / 2 + 28,
      top: blockTop - 24,
      bottom: blockTop + blockHeight
    };
  }

  function renderCard() {
    const template = loadedTemplates[state.templateIndex];

    if (!template) {
      return;
    }

    canvas.width = template.width;
    canvas.height = template.height;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(template.image, 0, 0, canvas.width, canvas.height);
    drawTextBlock();
    updateTemplateUI();

    if (!draggingText) {
      syncStateToUrl();
    }
  }

  function scheduleRender() {
    if (renderFrame !== null) {
      cancelAnimationFrame(renderFrame);
    }

    renderFrame = window.requestAnimationFrame(() => {
      renderFrame = null;
      renderCard();
    });
  }

  function isPointInsideText(x, y) {
    return Boolean(
      textBounds
      && x >= textBounds.left
      && x <= textBounds.right
      && y >= textBounds.top
      && y <= textBounds.bottom
    );
  }

  function getCanvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    };
  }

  function clampTextPosition(x, y) {
    state.textX = Math.min(Math.max(x / canvas.width, 0.16), 0.84);
    state.textY = Math.min(Math.max(y / canvas.height, 0.12), 0.84);
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = "async";

      image.onload = () => {
        resolve({
          image,
          width: image.naturalWidth || 1500,
          height: image.naturalHeight || 2400
        });
      };
      image.onerror = () => reject(new Error(`Could not load template: ${src}`));
      image.src = src;
    });
  }

  async function loadTemplates() {
    const templates = await Promise.all(templateConfigs.map((template) => loadImage(template.src)));

    templates.forEach((loadedTemplate, index) => {
      loadedTemplates[index] = {
        ...loadedTemplate,
        ...templateConfigs[index]
      };
    });
  }

  function updateStateAndRender() {
    state.recipient = recipientInput.value;
    state.message = messageInput.value;
    state.fontId = fontSelect.value;
    state.color = colorInput.value;
    state.scale = Number.parseInt(fontSizeInput.value, 10) || defaults.scale;
    fontSizeValue.textContent = `${state.scale}%`;
    scheduleRender();
  }

  function changeTemplate(nextIndex) {
    state.templateIndex = clampTemplateIndex(nextIndex);

    scheduleRender();
  }

  function createFileName() {
    const normalizedName = state.recipient.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return normalizedName ? `eid-card-${normalizedName}.png` : "eid-card.png";
  }

  function canvasToBlob() {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Canvas export failed."));
        }
      }, "image/png");
    });
  }

  async function exportCanvasBlob() {
    try {
      return await canvasToBlob();
    } catch (error) {
      const dataUrl = canvas.toDataURL("image/png");
      const response = await fetch(dataUrl);
      return response.blob();
    }
  }

  async function downloadCard() {
    const blob = await exportCanvasBlob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = objectUrl;
    link.download = createFileName();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  }

  async function shareCard() {
    const blob = await exportCanvasBlob();
    const file = new File([blob], createFileName(), { type: "image/png" });

    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
      await navigator.share({
        files: [file],
        title: "ঈদ শুভেচ্ছা কার্ড",
        text: "একটি কাস্টম ঈদ কার্ড শেয়ার করা হচ্ছে।"
      });
      setStatus("Card shared successfully.");
      return;
    }

    if (navigator.clipboard && window.ClipboardItem && window.isSecureContext) {
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      setStatus("Card image copied to your clipboard.");
      return;
    }

    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(window.location.href);
      setStatus("Sharing is limited here, so the card link was copied instead.");
      return;
    }

    await downloadCard();
    setStatus("Sharing is not supported here, so the card was downloaded instead.");
  }

  loadStateFromUrl();
  buildTemplateWheel();
  syncInputsFromState();

  [
    [recipientInput, "input"],
    [messageInput, "input"],
    [fontSelect, "change"],
    [fontSizeInput, "input"]
  ].forEach(([element, eventName]) => {
    element.addEventListener(eventName, updateStateAndRender);
  });

  colorInput.addEventListener("input", () => {
    customColorTouched = true;
    updateStateAndRender();
  });

  [
    [boldToggle, "isBold"],
    [italicToggle, "isItalic"]
  ].forEach(([button, key]) => {
    if (!button) {
      return;
    }

    button.addEventListener("click", () => {
      state[key] = !state[key];
      syncStyleToggleState();
      scheduleRender();
    });
  });

  prevBtn.addEventListener("click", () => {
    const nextIndex = (state.templateIndex - 1 + templateConfigs.length) % templateConfigs.length;
    changeTemplate(nextIndex);
  });

  nextBtn.addEventListener("click", () => {
    const nextIndex = (state.templateIndex + 1) % templateConfigs.length;
    changeTemplate(nextIndex);
  });

  templateWheel.addEventListener("click", (event) => {
    const button = event.target.closest(".template-thumb");

    if (!button) {
      return;
    }

    const nextIndex = Number.parseInt(button.dataset.templateIndex || "", 10);
    changeTemplate(nextIndex);
  });

  templateWheel.addEventListener("pointerdown", (event) => {
    dragStartX = event.clientX;
  });

  templateWheel.addEventListener("pointerup", (event) => {
    if (dragStartX === null) {
      return;
    }

    const deltaX = event.clientX - dragStartX;
    dragStartX = null;

    if (Math.abs(deltaX) < 40) {
      return;
    }

    if (deltaX < 0) {
      changeTemplate((state.templateIndex + 1) % templateConfigs.length);
      return;
    }

    changeTemplate((state.templateIndex - 1 + templateConfigs.length) % templateConfigs.length);
  });

  templateWheel.addEventListener("pointerleave", () => {
    dragStartX = null;
  });

  window.addEventListener("resize", scheduleRender);

  canvas.addEventListener("pointerdown", (event) => {
    if (!isEditModeEnabled()) {
      return;
    }

    const point = getCanvasPoint(event);

    if (!isPointInsideText(point.x, point.y)) {
      return;
    }

    draggingText = true;
    dragOffsetX = point.x - (canvas.width * state.textX);
    dragOffsetY = point.y - (canvas.height * state.textY);
    canvas.setPointerCapture(event.pointerId);
    canvas.style.cursor = "grabbing";
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!isEditModeEnabled()) {
      if (!draggingText) {
        canvas.style.cursor = "default";
      }
      return;
    }

    const point = getCanvasPoint(event);

    if (draggingText) {
      clampTextPosition(point.x - dragOffsetX, point.y - dragOffsetY);
      scheduleRender();
      return;
    }

    canvas.style.cursor = isPointInsideText(point.x, point.y) ? "grab" : "default";
  });

  const stopDraggingText = (event) => {
    if (!draggingText) {
      return;
    }

    draggingText = false;
    canvas.style.cursor = "default";
    syncStateToUrl();

    if (event && typeof event.pointerId === "number") {
      canvas.releasePointerCapture(event.pointerId);
    }
  };

  canvas.addEventListener("pointerup", stopDraggingText);
  canvas.addEventListener("pointercancel", stopDraggingText);
  canvas.addEventListener("pointerleave", () => {
    if (!draggingText) {
      canvas.style.cursor = "default";
    }
  });

  moveTextToggle.addEventListener("change", () => {
    giftFlipCard.classList.toggle("is-edit-mode", isEditModeEnabled());

    if (!isEditModeEnabled()) {
      draggingText = false;
      canvas.style.cursor = "default";
      setStatus("");
      return;
    }

    setStatus("Drag the writing on the card.");
  });

  downloadBtn.addEventListener("click", async () => {
    try {
      await downloadCard();
      setStatus("Card downloaded as a PNG file.");
    } catch (error) {
      console.error(error);
      setStatus("Could not download the card. Please try again.", true);
    }
  });

  shareBtn.addEventListener("click", async () => {
    try {
      setStatus("Preparing your card for sharing...");
      await shareCard();
    } catch (error) {
      if (error && error.name === "AbortError") {
        setStatus("Sharing was canceled.");
        return;
      }

      console.error(error);
      setStatus("Could not share the card. Try downloading it instead.", true);
    }
  });

  resetBtn.addEventListener("click", () => {
    Object.assign(state, defaults);
    customColorTouched = false;
    syncInputsFromState();
    scheduleRender();
    setStatus("");
  });

  try {
    setStatus("");
    await loadTemplates();
    renderCard();
    setStatus("");
  } catch (error) {
    console.error(error);
    setStatus("The templates could not be loaded. Please refresh the page and try again.", true);
    downloadBtn.disabled = true;
    shareBtn.disabled = true;
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    resetBtn.disabled = true;
    recipientInput.disabled = true;
    messageInput.disabled = true;
    fontSelect.disabled = true;
    colorInput.disabled = true;
    fontSizeInput.disabled = true;
    if (boldToggle) {
      boldToggle.disabled = true;
    }
    if (italicToggle) {
      italicToggle.disabled = true;
    }
    templateButtons.forEach((button) => {
      button.disabled = true;
    });
  }
});
