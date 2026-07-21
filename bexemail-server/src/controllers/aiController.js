exports.generateSubject = async (req, res) => {
  const { topic, tone } = req.body;

  if (!topic) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  // Simulate AI delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Mock responses based on tone
  const suggestions = {
    professional: [
      `Important Update: New Features in ${topic}`,
      `Exclusive Insights on ${topic}`,
      `Maximizing ROI with ${topic} Strategies`
    ],
    casual: [
      `You won't believe these ${topic} updates!`,
      `Quick question about ${topic} 🤔`,
      `Let's talk about ${topic}...`
    ],
    urgent: [
      `Action Required: ${topic} Closing Soon!`,
      `Last Chance: ${topic} Inside`,
      `Don't miss out on ${topic}!`
    ]
  };

  const selectedTone = tone && suggestions[tone] ? tone : 'professional';
  const subjects = suggestions[selectedTone];

  res.json({ subjects });
};
