/**
 * AI Email Campaign Controller using production-ready prompts
 */

// Prompt 1 System Prompt
const AI_COPYWRITER_SYSTEM_PROMPT = `You are an expert AI email copywriter integrated into a multi-tenant CRM campaign system. Generate a high-converting, professional marketing email campaign block based on user inputs. 
Constraints:
- Return the output as strict JSON format containing keys: "subject_line", "preview_text", and "html_body".
- Do not include raw markdown wrappers outside of the JSON block.
- Keep tone professional, engaging, and personalized using user variables like {{first_name}} and {{company_name}}.`;

// Prompt 2 System Prompt
const AB_TEST_OPTIMIZER_SYSTEM_PROMPT = `You are a campaign optimization AI engine. Generate two distinct variants (Variant A and Variant B) for an email blast subject line and body text.
Constraints:
- Ensure Variant A focuses on direct value metrics, while Variant B focuses on curiosity/urgency.
- Output formatting must match clean HTML elements suitable for insertion into campaign templates without breaking layout bounds.`;

exports.generateSubject = async (req, res) => {
  const { topic, tone } = req.body;

  if (!topic) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  await new Promise(resolve => setTimeout(resolve, 1000));

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

/**
 * AI Campaign Generation Endpoint (Prompt 1)
 */
exports.generateCampaign = async (req, res) => {
  try {
    const { topic, audience, goal, tone } = req.body;
    if (!topic) {
      return res.status(400).json({ error: 'Topic is required for AI campaign generation' });
    }

    // Simulate AI synthesis following AI_COPYWRITER_SYSTEM_PROMPT constraints
    await new Promise(resolve => setTimeout(resolve, 1200));

    const selectedTone = tone || 'professional';
    
    const mockResponse = {
      subject_line: `Transform Your ${topic} Strategy with {{company_name}}`,
      preview_text: `Hi {{first_name}}, discover how {{company_name}} helps you streamline ${topic} for better results.`,
      html_body: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
  <h2 style="color: #2563eb; margin-top: 0;">Hello {{first_name}},</h2>
  <p>We are excited to share exclusive insights on <strong>${topic}</strong> tailored specifically for {{company_name}}.</p>
  <p>Our latest automated workflow solutions empower your team to optimize email campaigns, double click-through rates, and elevate audience engagement effortlessly.</p>
  <div style="text-align: center; margin: 30px 0;">
    <a href="#" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Get Started Now</a>
  </div>
  <p style="font-size: 0.9em; color: #64748b;">Best regards,<br>The {{company_name}} Marketing Team</p>
</div>`
    };

    res.json(mockResponse);
  } catch (error) {
    console.error('AI generateCampaign error:', error);
    res.status(500).json({ error: 'Failed to generate AI email campaign: ' + error.message });
  }
};

/**
 * A/B Testing Variant Generator Endpoint (Prompt 2)
 */
exports.generateAbVariants = async (req, res) => {
  try {
    const { topic, value_metric, urgency_angle } = req.body;
    if (!topic) {
      return res.status(400).json({ error: 'Topic is required for A/B testing generation' });
    }

    await new Promise(resolve => setTimeout(resolve, 1200));

    const mockVariants = {
      system_prompt: AB_TEST_OPTIMIZER_SYSTEM_PROMPT,
      variant_a: {
        angle: 'Direct Value Metrics Focus',
        subject_line: `Boost Your ${topic} Conversions by 40% with {{company_name}}`,
        preview_text: `Data-backed results for {{first_name}}: Increase ROI on ${topic} today.`,
        html_body: `<div style="font-family: sans-serif; padding: 20px; background-color: #f8fafc; border-radius: 8px;">
  <h3 style="color: #0f172a;">Proven ${topic} ROI for {{company_name}}</h3>
  <p>Hi {{first_name}}, companies using our automated campaign stack see an average <strong>40% boost in conversion rates</strong> within 30 days.</p>
  <ul>
    <li>3x higher delivery rates with custom domain DKIM</li>
    <li>Zero manual setup for SMTP rotators</li>
    <li>Comprehensive analytical breakdown per campaign</li>
  </ul>
  <p><a href="#" style="color: #0284c7; font-weight: bold;">View Data Report &rarr;</a></p>
</div>`
      },
      variant_b: {
        angle: 'Curiosity & Urgency Focus',
        subject_line: `Are you making this ${topic} mistake, {{first_name}}?`,
        preview_text: `Limited time: See what's missing in {{company_name}}'s email strategy...`,
        html_body: `<div style="font-family: sans-serif; padding: 20px; background-color: #fff1f2; border-radius: 8px;">
  <h3 style="color: #9f1239;">Don't miss this update on ${topic}!</h3>
  <p>Hi {{first_name}}, 80% of teams overlook one key setting when running ${topic} blasts.</p>
  <p>Is {{company_name}} leaving engagement on the table? Check your configuration before your next blast.</p>
  <p style="margin-top: 20px;"><a href="#" style="background-color: #e11d48; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold;">Check Your Score &rarr;</a></p>
</div>`
      }
    };

    res.json(mockVariants);
  } catch (error) {
    console.error('AI generateAbVariants error:', error);
    res.status(500).json({ error: 'Failed to generate A/B test variants: ' + error.message });
  }
};
