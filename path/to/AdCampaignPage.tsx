const newAd = {
  title: adTitle || '',
  description: adDescription || '',
  imageUrl: adImageUrl || undefined,
  targetUrl: adTargetUrl || undefined,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Ensure proper handling of potential undefined values for template strings
const adMessage = `Ad Created: ${newAd.title || 'Untitled'} - ${newAd.description || 'No Description Available'}`;

export default newAd;