import nodeFetch from "node-fetch";
import { DOMParser } from "xmldom";
import { IDPEntityDescriptor } from "../../generated/backend/IDPEntityDescriptor";
import { log } from "./logger";

export interface IDPMetadataOptions {
  cert: ReadonlyArray<string>;
  entryPoint: string;
  logoutUrl: string;
}

interface IDPMetadataParams extends IDPMetadataOptions {
  entityID: string;
}

export class IDPMetadata {
  public cert: ReadonlyArray<string>;
  public entityID: string;
  public entryPoint: string;
  public logoutUrl: string;
  constructor(params: IDPMetadataParams) {
    this.cert = params.cert;
    this.entityID = params.entityID;
    this.entryPoint = params.entryPoint;
    this.logoutUrl = params.logoutUrl;
  }

  public getIDPOption(): IDPMetadataOptions {
    return {
      cert: Array.from(this.cert),
      entryPoint: this.entityID,
      logoutUrl: this.logoutUrl
    };
  }
}

const EntityDescriptorTAG = "md:EntityDescriptor";
const X509CertificateTAG = "ds:X509Certificate";
const SingleSignOnServiceTAG = "md:SingleSignOnService";
const SingleLogoutServiceTAG = "md:SingleLogoutService";

export async function parseIdpMetadata(
  ipdMetadataPage: string
): Promise<ReadonlyArray<IDPEntityDescriptor>> {
  const domParser = new DOMParser().parseFromString(ipdMetadataPage);
  const entityDescriptors = domParser.getElementsByTagName(EntityDescriptorTAG);
  return Array.from(entityDescriptors).reduce(
    (idp: ReadonlyArray<IDPEntityDescriptor>, element: Element) => {
      const elementInfoOrErrors = IDPEntityDescriptor.decode({
        cert: [
          (element.getElementsByTagName(X509CertificateTAG).item(0) as Element)
            .textContent
        ],
        entityID: element.getAttribute("entityID"),
        entryPoint: (element
          .getElementsByTagName(SingleSignOnServiceTAG)
          .item(0) as Element).getAttribute("Location"),
        logoutUrl: (element
          .getElementsByTagName(SingleLogoutServiceTAG)
          .item(0) as Element).getAttribute("Location")
      });
      if (elementInfoOrErrors.isLeft()) {
        log.info("Invalid md:EntityDescriptor. Skipping ...");
        return idp;
      }
      return [...idp, elementInfoOrErrors.value];
    },
    []
  );
}

export async function fetchIdpMetadata(
  IDP_METADATA_URL: string
): Promise<string> {
  const idpMetadataRequest = await nodeFetch(IDP_METADATA_URL);
  return await idpMetadataRequest.text();
}
