export function buildImageUrl(request, imagePath) {
  if (!imagePath) return null;
  return `${request.protocol}://${request.host}/uploads${imagePath}`;
}

export function withImageUrl(request, book) {
  return { ...book, image: buildImageUrl(request, book.image) };
}
