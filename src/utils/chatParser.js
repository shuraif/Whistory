// iOS Format: [dd/mm/yy, hh:mm:ss AM/PM] Author: Message
// iOS Attachment: <attached: filename.ext>
// Android Format: dd/mm/yy, hh:mm - Author: Message
// Android Attachment: filename.ext (file attached)

const sanitizeText = (text) => {
  // Remove directional and formatting characters commonly found in iOS exports
  return text.replace(/[\u200E\u202F\u00A0\u200B\u202A\u202B\u202C\u202D\u202E\u2066\u2067\u2068\u2069]/g, ' ').trim();
};

export const parseChatFile = async (fileText) => {
  const lines = fileText.split('\n');
  const messages = [];
  let currentMsg = null;
  const participants = new Set();

  const iosRegex = /^\[(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}),\s+(.*?)\]\s+(.*?):\s+(.*)$/s;
  const iosSystemRegex = /^\[(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}),\s+(.*?)\]\s+(.*)$/s;

  const androidRegex = /^(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}),\s+(.*?)\s+-\s+(.*?):\s+(.*)$/s;
  const androidSystemRegex = /^(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}),\s+(.*?)\s+-\s+(.*)$/s;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!rawLine.trim()) continue;

    const line = sanitizeText(rawLine);
    
    let match = iosRegex.exec(line) || androidRegex.exec(line);
    
    if (match) {
      if (currentMsg) {
        messages.push(currentMsg);
      }
      
      const dateStr = match[1];
      const timeStr = match[2];
      const author = match[3].trim();
      let text = match[4];
      
      let attachment = null;
      
      // Parse attachments
      const iosAttachmentMatch = text.match(/<attached:\s+(.*?)>/i);
      const androidAttachmentMatch = text.match(/^(.*?)\s+\(file attached\)$/i);
      
      if (iosAttachmentMatch) {
        attachment = iosAttachmentMatch[1];
        text = text.replace(iosAttachmentMatch[0], '').trim();
      } else if (androidAttachmentMatch) {
        attachment = androidAttachmentMatch[1];
        text = text.replace(androidAttachmentMatch[0], '').trim();
      }

      // Check if it's actually an Android system message that looks like a message (e.g. "Messages and calls are end-to-end encrypted...")
      if (author === 'Messages and calls are end-to-end encrypted') {
          // This is a system message!
      }

      currentMsg = {
        id: `msg-${messages.length}`,
        date: dateStr,
        time: timeStr,
        author,
        text,
        attachment,
        isSystem: false,
        rawTimestamp: parseTimestamp(dateStr, timeStr)
      };
      participants.add(author);
      continue;
    }

    let sysMatch = iosSystemRegex.exec(line) || androidSystemRegex.exec(line);
    if (sysMatch && !sysMatch[3].includes(':')) {
      if (currentMsg) {
        messages.push(currentMsg);
        currentMsg = null;
      }
      messages.push({
        id: `msg-${messages.length}`,
        date: sysMatch[1],
        time: sysMatch[2],
        text: sysMatch[3].trim(),
        isSystem: true,
        rawTimestamp: parseTimestamp(sysMatch[1], sysMatch[2])
      });
      continue;
    }

    // Multi-line message appended to currentMsg
    if (currentMsg) {
      currentMsg.text += '\n' + rawLine.trim(); // preserve original line break, but trim trailing spaces
    }
  }

  if (currentMsg) {
    messages.push(currentMsg);
  }

  return {
    messages,
    participants: Array.from(participants)
  };
};

function parseTimestamp(dateStr, timeStr) {
  try {
    const dStr = dateStr.replace(/[.-]/g, '/');
    let parts = dStr.split('/');
    let month = parts[0];
    let day = parts[1];
    let year = parts[2];
    
    // In many locales, it's dd/mm/yy. Let's assume dd/mm/yy.
    // If the first part is > 12, it's definitely day.
    if (parseInt(month) > 12) {
        month = parts[1];
        day = parts[0];
    }

    if (year.length === 2) year = '20' + year;
    return new Date(`${month}/${day}/${year} ${timeStr}`).getTime() || 0; 
  } catch (e) {
    return 0;
  }
}
