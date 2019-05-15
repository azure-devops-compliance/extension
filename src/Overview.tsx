import * as React from "react";
import { IAzDoService, IOverviewReport } from "./services/IAzDoService";

import { ITableColumn, SimpleTableCell, Table } from "azure-devops-ui/Table";
import { ObservableArray, ObservableValue } from "azure-devops-ui/Core/Observable";
import { Page } from "azure-devops-ui/Page";
import { Card } from "azure-devops-ui/Card";
import { IStatusProps, Statuses } from "azure-devops-ui/Status";
import { renderCheckmark, renderStringWithWhyTooltip } from "./components/TableRenderers";
import { Link } from "azure-devops-ui/Link";
import { onSize } from "./components/TableBehaviors";
import ReconcileButton from "./components/ReconcileButton";

import CompliancyHeader from "./components/CompliancyHeader";

import "./css/styles.css";
import { ICompliancyCheckerService } from "./services/ICompliancyCheckerService";

interface ITableItem {
    description: string;
    why: string;
    status: IStatusProps;
    hasReconcilePermission: boolean;
    reconcileUrl: string;
    reconcileImpact: string[];
    compliancyCheckerService: ICompliancyCheckerService;
}

interface IOverviewProps {
    azDoService: IAzDoService;
    compliancyCheckerService: ICompliancyCheckerService;
}

export default class extends React.Component<
    IOverviewProps,
    {
        report: IOverviewReport;
        isLoading: boolean;
        isRescanning: boolean;
        token: string;
    }
> {
  private itemProvider = new ObservableArray<ITableItem>();

  constructor(props: IOverviewProps) {
    super(props);
    this.state = {
      report: {
        date: new Date(0),
        reports: [],
        rescanUrl: "",
        hasReconcilePermissionUrl: ""
      },
      isLoading: true,
      isRescanning: false,
      token: ""
    };
  }

  private async getReportdata(): Promise<void> {
    const report = await this.props.azDoService.GetReportsFromDocumentStorage<IOverviewReport>("globalpermissions");
    const hasReconcilePermission = await this.props.compliancyCheckerService.HasReconcilePermission(report.hasReconcilePermissionUrl);
    const token = await this.props.azDoService.GetAppToken();

    this.itemProvider.removeAll();

    this.itemProvider.push(
      ...report.reports.map<ITableItem>(x => ({
        description: x.description,
        why: x.why,
        hasReconcilePermission: hasReconcilePermission,
        reconcileUrl: x.reconcile!.url,
        reconcileImpact: x.reconcile!.impact,
        status: x.status ? Statuses.Success : Statuses.Failed,
        compliancyCheckerService: this.props.compliancyCheckerService
      }))
    );

    this.setState({ isLoading: false, report: report, token: token });
  }

  async componentDidMount() {
    await this.getReportdata();
  }


  private renderReconcileButton

  render() {
    return (
      <Page>
        <CompliancyHeader
          headerText="Project compliancy"
          lastScanDate={this.state.report.date}
          rescanUrl={this.state.report.rescanUrl}
          onRescanFinished={async () => { await this.getReportdata() } }
          compliancyCheckerService={this.props.compliancyCheckerService}
        />

        <div className="page-content page-content-top flex-row">
          <div className="flex-grow">
            <Card>
              {this.state.isLoading ? (
                <div>Loading...</div>
              ) : (
                <div>
                  <Table<ITableItem>
                    columns={[
                      {
                        id: "description",
                        name: "Description",
                        renderCell: renderStringWithWhyTooltip,
                        onSize: onSize,
                        width: new ObservableValue(450)
                      },
                      {
                        id: "status",
                        name: "Status",
                        onSize: onSize,
                        width: new ObservableValue(75),
                        renderCell: renderCheckmark
                      },
                      {
                        id: "reconcileUrl",
                        name: "",
                        onSize: onSize,
                        width: new ObservableValue(130),
                        renderCell(
                          _rowIndex: number,
                          columnIndex: number,
                          tableColumn: ITableColumn<ITableItem>,
                          item: ITableItem
                        ) {
                          let content =
                            item.status !== Statuses.Success && item.hasReconcilePermission ? (
                              <ReconcileButton reconcilableItem={item} />
                            ) : (
                              ""
                            );

                          return (
                            <SimpleTableCell
                              columnIndex={columnIndex}
                              tableColumn={tableColumn}
                              key={"col-" + columnIndex}
                              contentClassName="fontWeightSemiBold font-weight-semibold fontSizeM font-size-m scroll-hidden"
                            >
                              {content}
                            </SimpleTableCell>
                          );
                        }
                      }
                    ]}
                    itemProvider={this.itemProvider}
                    behaviors={[]}
                  />
                </div>
            </Page>
        );
    }
}
