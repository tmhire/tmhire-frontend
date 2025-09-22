export enum DeleteType {
  permanent = "permanently",
  temporary = "temporarily",
  cancel = "cancelation",
}

export enum CanceledBy {
  client = "Client",
  company = "Company",
}

export enum CancelReason {
  ecl = "Exceeded Credit Limit",
  snr = "Site Not Ready",
  pr = "Price Revision",
  r = "Rain",
  o = "Others",
}
