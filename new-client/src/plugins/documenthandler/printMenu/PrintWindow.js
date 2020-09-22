import React from "react";
import { withStyles } from "@material-ui/core/styles";
import { withSnackbar } from "notistack";
import Grid from "@material-ui/core/Grid";
import { Typography } from "@material-ui/core";
import ReactDOM from "react-dom";
import Divider from "@material-ui/core/Divider";
import Button from "@material-ui/core/Button";
import ArrowBackIcon from "@material-ui/icons/ArrowBack";
import Checkbox from "@material-ui/core/Checkbox";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import OpenInNewIcon from "@material-ui/icons/OpenInNew";
import PrintList from "./PrintList";
import TableOfContents from "./TableOfContents";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import CircularProgress from "@material-ui/core/CircularProgress";

const styles = (theme) => ({
  gridContainer: {
    padding: theme.spacing(4),
    height: "100%",
  },
  middleContainer: {
    overflowX: "auto",
    flexBasis: "100%",
    marginTop: theme.spacing(2),
  },
  headerContainer: {
    marginBottom: theme.spacing(2),
  },
  footerContainer: {
    flexBasis: "10%",
    borderTop: "1px solid grey",
  },
});

const maxHeight = 950;
const imageResizeRatio = 0.7;

class PrintWindow extends React.PureComponent {
  state = {
    printText: true,
    printImages: true,
    printMaps: false,
    allDocumentsToggled: false,
    chapterInformation: this.setChapterInfo(),
    printContent: undefined,
    pdfLoading: false,
  };

  constructor(props) {
    super(props);

    this.printPages = [{ type: "TOC", availableHeight: 950, content: [] }];
  }

  componentDidMount = () => {
    this.props.localObserver.subscribe(
      "chapter-components-appended",
      (renderedChapters) => {
        this.setState(
          {
            printContent: renderedChapters,
          },
          () => {
            this.printContents();
          }
        );
      }
    );
  };

  componentWillUnmount = () => {
    this.props.localObserver.unsubscribe("chapter-components-appended");
  };

  getAvailableHeight = () => {
    return this.printPages[this.printPages.length - 1].availableHeight;
  };

  checkIfTagIsTitle = (node) => {
    let tagName = node.tagName;
    if (node.hasChildNodes() && node.children.length === 1) {
      tagName = node.firstChild.tagName;
    }
    return ["H1", "H2", "H3", "H4", "H5"].includes(tagName);
  };

  contentFitsCurrentPage = (content) => {
    let contentHeight = content.clientHeight;
    let availableHeight = this.getAvailableHeight();
    return contentHeight <= availableHeight;
  };

  addContentToNewPage = (content, maxHeight, type) => {
    this.printPages.push({
      type: type,
      availableHeight: maxHeight - content.clientHeight,
      content: [content],
    });
  };

  addContentToCurrentPage = (content) => {
    this.printPages[this.printPages.length - 1].availableHeight -=
      content.clientHeight;
    this.printPages[this.printPages.length - 1].content.push(content);
  };

  addNewPage = (type, maxHeight) => {
    this.printPages.push({
      type: type,
      availableHeight: maxHeight,
      content: [],
    });
  };

  appendHeaderToPdf = (content, type) => {
    if (this.getAvailableHeight() >= 0.4 * maxHeight) {
      this.addContentToCurrentPage(content);
    } else {
      this.addContentToNewPage(content, maxHeight, type);
    }
  };

  isTocListElement = (type, content) => {
    return type === "TOC" && content.tagName === "LI";
  };

  distributeContentOnPages = (content, type) => {
    if (this.checkIfTagIsTitle(content)) {
      this.appendHeaderToPdf(content, type);
    } else {
      if (this.contentFitsCurrentPage(content)) {
        this.addContentToCurrentPage(content);
      } else {
        if (!content.hasChildNodes() || this.isTocListElement(type, content)) {
          this.addContentToNewPage(content, maxHeight, type);
        } else {
          [...content.children].forEach((child) => {
            this.distributeContentOnPages(child, type);
          });
        }
      }
    }
  };

  getCanvasFromContent = (page) => {
    let sWidth = Math.round((210 * 96) / 25.4);
    let sHeight = Math.round((297 * 96) / 25.4);
    let dWidth = Math.round((210 * 96) / 25.4);
    let dHeight = Math.round((297 * 96) / 25.4);
    let pR = window.devicePixelRatio;
    let onePageDiv = document.createElement("div");

    onePageDiv.style.position = "absolute";
    onePageDiv.style.left = "-10000px";
    onePageDiv.style.width = `${210}mm`;
    onePageDiv.style.padding = "50px";

    document.body.appendChild(onePageDiv);

    page.content.forEach((child) => {
      onePageDiv.appendChild(child);
    });

    return html2canvas(onePageDiv, {
      allowTaint: false,
      logging: false,
    }).then((canvas) => {
      let onePageCanvas = document.createElement("canvas");

      onePageCanvas.width = Math.round((210 * 96) / 25.4);
      onePageCanvas.height = Math.round((297 * 96) / 25.4);

      let ctx = onePageCanvas.getContext("2d");

      ctx.fillStyle = "white";
      ctx.fillRect(
        0,
        0,
        onePageCanvas.width + 200 * pR, //Just add 200px to fix edge-bug
        onePageCanvas.height + 200 * pR //Just add 200px to fix edge-bug
      );

      ctx.drawImage(
        canvas,
        0,
        0,
        sWidth * pR,
        sHeight * pR,
        0,
        0,
        dWidth,
        dHeight
      );
      document.body.removeChild(onePageDiv);
      return onePageCanvas;
    });
  };

  resizeImage = (img) => {
    img.height = img.clientHeight * imageResizeRatio;
    img.width = img.clientWidth * imageResizeRatio;
  };

  imageFitsOnePage = (img) => {
    return img.clientHeight < maxHeight * 0.9;
  };

  loadImage = (img) => {
    return new Promise((resolve, reject) => {
      img.onload = () => {
        if (this.imageFitsOnePage(img)) {
          resolve(img);
        } else {
          this.resizeImage(img);
          resolve(img);
        }
      };
      img.onerror = () => reject(img);
    });
  };

  addFooters = (pdf, numToc) => {
    const pageCount = pdf.internal.getNumberOfPages();

    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(8);
    for (var i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      if (i === 1) {
        pdf.text(
          `Skapad: ${new Date().toLocaleString()}`,
          pdf.internal.pageSize.width / 2,
          pdf.internal.pageSize.height - 20,
          {
            align: "center",
          }
        );
      } else if (i > numToc) {
        pdf.text(
          `Sida ${i - numToc} av ${pageCount - numToc}`,
          pdf.internal.pageSize.width / 2,
          pdf.internal.pageSize.height - 20,
          {
            align: "center",
          }
        );
      }
    }
    return pdf;
  };

  customRender = (element, container) => {
    return new Promise((resolve) => {
      ReactDOM.render(element, container, (e) => {
        resolve();
      });
    });
  };

  createPrintElement = (id) => {
    let div = document.createElement("div");
    div.style = "position : absolute; left : -10000px; width : 210mm";
    div.id = id;
    return div;
  };

  renderToc = () => {
    this.toc = this.createPrintElement("toc");
    return this.customRender(
      <TableOfContents chapters={this.state.chapterInformation} />,
      this.toc
    ).then(() => {
      document.body.appendChild(this.toc);
    });
  };

  renderContent = () => {
    this.content = this.createPrintElement("content");
    return this.customRender(this.state.printContent, this.content).then(() => {
      document.body.appendChild(this.content);
    });
  };

  areAllImagesLoaded = () => {
    return Promise.allSettled(
      [...this.content.getElementsByTagName("img")].map((img) => {
        return this.loadImage(img);
      })
    );
  };

  printContents = () => {
    Promise.all([this.renderToc(), this.renderContent()]).then(() => {
      this.areAllImagesLoaded().then(() => {
        this.printPages = [{ type: "TOC", availableHeight: 950, content: [] }];
        this.distributeContentOnPages(this.toc, "TOC");
        this.addNewPage("CONTENT", 950);
        this.distributeContentOnPages(this.content, "CONTENT");

        let canvasPromises = this.printPages.map((page, index) => {
          return this.getCanvasFromContent(page);
        });

        Promise.all(canvasPromises).then((canvases) => {
          let pdf = new jsPDF("p", "pt");
          let numToc = this.printPages.filter((page) => page.type === "TOC")
            .length;
          canvases.forEach((canvas, index) => {
            if (index > 0) {
              pdf.addPage();
            }
            //! now we declare that we're working on that page
            pdf.setPage(index + 1);
            pdf.addImage(canvas, "PNG", 0, 0);
          });
          pdf = this.addFooters(pdf, numToc);
          pdf.save(`oversiktsplan-${new Date().toLocaleString()}.pdf`);
          document.body.removeChild(this.toc);
          document.body.removeChild(this.content);
          this.toggleAllDocuments(false);
          this.setState({
            pdfLoading: false,
            printContent: undefined,
            printMaps: false,
          });
        });
      });
    });
  };

  handleCheckboxChange = (chapter) => {
    const { model } = this.props;
    let newChapterInformation = [...this.state.chapterInformation];

    let toggledChapter = model.getChapterById(
      newChapterInformation,
      chapter.id
    );
    toggledChapter.chosenForPrint = !toggledChapter.chosenForPrint;
    this.toggleSubChapters(toggledChapter, toggledChapter.chosenForPrint);

    this.setState({
      chapterInformation: newChapterInformation,
      allDocumentsToggled: false,
    });
  };

  toggleSubChapters(chapter, checked) {
    if (Array.isArray(chapter.chapters) && chapter.chapters.length > 0) {
      chapter.chapters.forEach((subChapter) => {
        subChapter.chosenForPrint = checked;
        this.toggleSubChapters(subChapter, checked);
      });
    }
  }

  setChapterInfo() {
    const { activeDocument, model } = this.props;
    let chapterInformation = model.getAllChapterInfo();

    let topChapter = chapterInformation.find(
      (topChapter) =>
        topChapter.headerIdentifier ===
        activeDocument.chapters[0].headerIdentifier
    );

    topChapter.chosenForPrint = true;
    this.toggleSubChapters(topChapter, true);

    return chapterInformation;
  }

  toggleAllDocuments = (toggled) => {
    this.state.chapterInformation.forEach((chapter) => {
      chapter.chosenForPrint = toggled;
      this.toggleSubChapters(chapter, toggled);
    });

    this.setState({
      allDocumentsToggled: toggled,
    });
  };

  removeTagsNotSelectedForPrint = (chapter) => {
    const { printImages, printText } = this.state;

    let elementsToRemove = [];
    const div = document.createElement("div");
    div.innerHTML = chapter.html;

    //A-tags should always be removed before printing
    Array.from(div.getElementsByTagName("a")).forEach((element) => {
      elementsToRemove.push(element);
    });
    if (!printImages) {
      Array.from(div.getElementsByTagName("figure")).forEach((element) => {
        elementsToRemove.push(element);
      });
    }
    if (!printText) {
      Array.from(div.querySelectorAll("p, h1, h2, h3, h4, h5, h6")).forEach(
        (element) => {
          elementsToRemove.push(element);
        }
      );
      chapter.header = "";
    }

    for (let i = 0; i < elementsToRemove.length; i++) {
      elementsToRemove[i].parentNode.removeChild(elementsToRemove[i]);
    }

    chapter.html = div.innerHTML;
    return chapter;
  };

  prepareChapterForPrint = (chapter) => {
    if (chapter.chapters && chapter.chapters.length > 0) {
      chapter.chapters.forEach((subChapter) => {
        if (subChapter.chapters && subChapter.chapters.length > 0) {
          return this.prepareChapterForPrint(subChapter);
        }
        if (!subChapter.chosenForPrint) {
          subChapter.html = "";
          subChapter.header = "";
        } else {
          subChapter = this.removeTagsNotSelectedForPrint(subChapter);
        }
      });
    }
    if (!chapter.chosenForPrint) {
      chapter.html = "";
      chapter.header = "";
    } else {
      chapter = this.removeTagsNotSelectedForPrint(chapter);
    }
    return chapter;
  };

  getChaptersToPrint = () => {
    let chaptersToPrint = JSON.parse(
      JSON.stringify(this.state.chapterInformation)
    );
    chaptersToPrint.forEach((chapter) => {
      chapter = this.prepareChapterForPrint(chapter);
    });

    return chaptersToPrint;
  };

  createPDF = () => {
    this.setState({ pdfLoading: true });
    const chaptersToPrint = this.getChaptersToPrint();
    this.props.localObserver.publish(
      "append-chapter-components",
      chaptersToPrint
    );
  };

  renderCheckboxes() {
    return (
      <Grid container>
        <Grid container item alignItems="center" spacing={2}>
          <Grid item xs={12}>
            <Typography variant="h6">Innehåll</Typography>
          </Grid>
          <Grid item xs align="center">
            <FormControlLabel
              value="Texter"
              control={
                <Checkbox
                  color="primary"
                  checked={this.state.printText}
                  onChange={() => {
                    this.setState({
                      printText: !this.state.printText,
                    });
                  }}
                />
              }
              label="Texter"
              labelPlacement="end"
            />
          </Grid>
          <Grid item xs align="center">
            <FormControlLabel
              value="Bilder"
              control={
                <Checkbox
                  color="primary"
                  checked={this.state.printImages}
                  onChange={() => {
                    this.setState({
                      printImages: !this.state.printImages,
                    });
                  }}
                />
              }
              label="Bilder"
              labelPlacement="end"
            />
          </Grid>
          <Grid item xs align="center">
            <FormControlLabel
              value="Kartor"
              control={
                <Checkbox
                  color="primary"
                  checked={this.state.printMaps}
                  onChange={() => {
                    this.setState({
                      printMaps: !this.state.printMaps,
                    });
                  }}
                />
              }
              label="Kartor"
              labelPlacement="end"
            />
          </Grid>
        </Grid>
      </Grid>
    );
  }

  renderCreatePDFButton() {
    const { classes } = this.props;
    return (
      <Grid
        item
        className={classes.footerContainer}
        container
        alignContent="center"
        alignItems="center"
        justify="center"
      >
        {!this.state.pdfLoading ? (
          <Button
            color="primary"
            variant="contained"
            startIcon={<OpenInNewIcon />}
            onClick={this.createPDF}
          >
            <Typography
              style={{ marginRight: "20px", marginLeft: "20px" }}
              justify="center"
            >
              Skapa PDF-utskrift
            </Typography>
          </Button>
        ) : (
          <CircularProgress size={"2rem"} />
        )}
      </Grid>
    );
  }

  render() {
    const {
      classes,
      togglePrintWindow,
      localObserver,
      documentWindowMaximized,
    } = this.props;
    const { chapterInformation } = this.state;
    return (
      <Grid
        container
        className={classes.gridContainer}
        wrap="nowrap"
        direction="column"
      >
        <Grid
          className={classes.headerContainer}
          alignItems="center"
          item
          container
        >
          <Grid item xs={4}>
            <Button
              color="primary"
              style={{ paddingLeft: 0 }}
              startIcon={<ArrowBackIcon />}
              onClick={togglePrintWindow}
            >
              <Typography justify="center">Tillbaka</Typography>
            </Button>
          </Grid>
          <Grid item xs={4}>
            <Typography align="center" variant="h6">
              Skapa PDF
            </Typography>
          </Grid>
        </Grid>
        <Divider></Divider>

        <Grid container item>
          <Grid xs={6} item>
            <Grid xs={12} item>
              <Typography variant="h6">Dokument</Typography>
            </Grid>

            <Grid xs={12} item>
              {" "}
              <FormControlLabel
                value="Välj alla dokument"
                control={
                  <Checkbox
                    color="primary"
                    checked={this.state.allDocumentsToggled}
                    onChange={() =>
                      this.toggleAllDocuments(!this.state.allDocumentsToggled)
                    }
                  />
                }
                label="Välj alla dokument"
                labelPlacement="end"
              />
            </Grid>
          </Grid>
          <Grid xs={6} item>
            <Grid xs={12} item>
              <Typography variant="h6">Innehåll</Typography>
            </Grid>
            <Grid xs={12} item>
              {" "}
              <FormControlLabel
                value="Inkludera kartor"
                control={
                  <Checkbox
                    color="primary"
                    checked={this.state.printMaps}
                    onChange={() =>
                      this.setState({ printMaps: !this.state.printMaps })
                    }
                  />
                }
                label="Inkludera kartor"
                labelPlacement="end"
              />
            </Grid>
          </Grid>
        </Grid>
        <Grid className={classes.middleContainer} item container>
          <PrintList
            chapters={chapterInformation}
            handleCheckboxChange={this.handleCheckboxChange}
            localObserver={localObserver}
          />
        </Grid>

        {documentWindowMaximized && this.renderCreatePDFButton()}
      </Grid>
    );
  }
}

export default withStyles(styles)(withSnackbar(PrintWindow));
