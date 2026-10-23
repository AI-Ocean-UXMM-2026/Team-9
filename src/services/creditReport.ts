export async function downloadCreditReport(
  element: HTMLElement,
  filename: string,
) {
  const [{ toPng }, { jsPDF }] = await Promise.all([
    import('html-to-image'),
    import('jspdf'),
  ]);
  await document.fonts.ready;
  const image = await toPng(element, {
    width: 794,
    height: 1123,
    pixelRatio: 2,
    backgroundColor: '#ffffff',
    style: {
      position: 'static',
      left: '0',
      top: '0',
      transform: 'none',
      margin: '0',
    },
  });
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });
  pdf.setProperties({
    title: 'FlowCredit Readiness Report',
    subject: 'User-prepared supporting financial records',
    creator: 'Shwe Taw Pyan Chi',
  });
  pdf.addImage(image, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
  await pdf.save(filename, { returnPromise: true });
}
