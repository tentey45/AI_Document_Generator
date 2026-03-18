export const generateDocument = async (prompt, userType, subOption, docStyle) => {
  const response = await fetch('/generate-document', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: prompt,
      user_type: userType,
      sub_option: subOption,
      doc_style: docStyle
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Failed to generate document');
  }

  const data = await response.json();
  return data.content;
};
