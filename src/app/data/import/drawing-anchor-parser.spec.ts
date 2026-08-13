import { parseDrawingAnchors, parseDrawingRels } from './drawing-anchor-parser';

// Potongan nyata dari xl/drawings/drawing1.xml berkas asli klien (dua
// twoCellAnchor pertama) — bukan rekaan.
const REAL_DRAWING_XML = `<?xml version="1.0" encoding="UTF-8"?>
<xdr:wsDr xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:a14="http://schemas.microsoft.com/office/drawing/2010/main" xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing"><xdr:twoCellAnchor><xdr:from><xdr:col>30</xdr:col><xdr:colOff>110568</xdr:colOff><xdr:row>20</xdr:row><xdr:rowOff>358466</xdr:rowOff></xdr:from><xdr:to><xdr:col>31</xdr:col><xdr:colOff>655992</xdr:colOff><xdr:row>20</xdr:row><xdr:rowOff>1932478</xdr:rowOff></xdr:to><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="2" name="Picture 5" descr="Picture 5"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId1"><a:extLst/></a:blip><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="21205268" y="3946216"/><a:ext cx="1421725" cy="1574013"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:ln w="12700" cap="flat"><a:noFill/><a:miter lim="400000"/></a:ln><a:effectLst/></xdr:spPr></xdr:pic><xdr:clientData/></xdr:twoCellAnchor><xdr:twoCellAnchor><xdr:from><xdr:col>30</xdr:col><xdr:colOff>112661</xdr:colOff><xdr:row>21</xdr:row><xdr:rowOff>67950</xdr:rowOff></xdr:from><xdr:to><xdr:col>31</xdr:col><xdr:colOff>607807</xdr:colOff><xdr:row>21</xdr:row><xdr:rowOff>1577258</xdr:rowOff></xdr:to><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="3" name="Picture 6" descr="Picture 6"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId2"><a:extLst/></a:blip><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="21207361" y="5922650"/><a:ext cx="1371447" cy="1509308"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:ln w="12700" cap="flat"><a:noFill/><a:miter lim="400000"/></a:ln><a:effectLst/></xdr:spPr></xdr:pic><xdr:clientData/></xdr:twoCellAnchor></xdr:wsDr>`;

// Potongan nyata dari xl/drawings/_rels/drawing1.xml.rels berkas asli klien.
const REAL_RELS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.jpeg"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image2.jpeg"/><Relationship Id="rId8" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/></Relationships>`;

describe('parseDrawingAnchors', () => {
  it('extracts row + relationship id for each anchor, in document order', () => {
    const anchors = parseDrawingAnchors(REAL_DRAWING_XML);

    expect(anchors).toEqual([
      { row: 20, rId: 'rId1' },
      { row: 21, rId: 'rId2' }
    ]);
  });

  it('returns an empty array for a drawing with no anchors', () => {
    const empty = '<?xml version="1.0"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing"></xdr:wsDr>';
    expect(parseDrawingAnchors(empty)).toEqual([]);
  });
});

describe('parseDrawingRels', () => {
  it('maps relationship ids to zip-relative media paths, stripping the leading "../"', () => {
    const rels = parseDrawingRels(REAL_RELS_XML);

    expect(rels).toEqual({
      rId1: 'media/image1.jpeg',
      rId2: 'media/image2.jpeg',
      rId8: 'media/image1.png'
    });
  });

  it('handles rId numbering that is not contiguous with file extensions (jpeg vs png reuse the same index)', () => {
    const rels = parseDrawingRels(REAL_RELS_XML);
    // rId1 -> image1.jpeg dan rId8 -> image1.png adalah DUA berkas berbeda
    // meski nomor "1" muncul di kedua nama file — bukan bug penomoran.
    expect(rels['rId1']).not.toBe(rels['rId8']);
  });
});
