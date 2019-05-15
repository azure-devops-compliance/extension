import * as React from "react";
import { IAzDoService, IBuildPipelinesReport } from "./services/IAzDoService";
import { Page } from "azure-devops-ui/Page";
import {
  HeaderCommandBarWithFilter, HeaderCommandBar
} from "azure-devops-ui/HeaderCommandBar";
import { ConditionalChildren } from "azure-devops-ui/ConditionalChildren";
import { SurfaceBackground, Surface } from "azure-devops-ui/Surface";
import { FilterBar } from "azure-devops-ui/FilterBar";
import { DropdownFilterBarItem } from "azure-devops-ui/Dropdown";
import { KeywordFilterBarItem } from "azure-devops-ui/TextFilterBarItem";
import { ObservableValue } from "azure-devops-ui/Core/Observable";
// import { TabBar, Tab } from "azure-devops-ui/Tabs";
import { Filter } from "azure-devops-ui/Utilities/Filter";
import { DropdownMultiSelection } from "azure-devops-ui/Utilities/DropdownSelection";

import BuildPipelinesList from "./components/BuildPipelinesList";
import PipelinesMasterDetail from "./components/MasterDetail";
import {
  getPossibleCompliancyStatuses,
  getCompliancyStatusAsListItem
} from "./components/CompliancyStatus";
import CompliancyHeader from "./components/CompliancyHeader";
import { Observer } from "azure-devops-ui/Observer";

import "./css/styles.css"
import { Link } from "azure-devops-ui/Link";
import { Card } from "azure-devops-ui/Card";
import { ICompliancyCheckerService } from "./services/ICompliancyCheckerService";

interface IBuildPipelinesProps {
  azDoService: IAzDoService;
  compliancyCheckerService: ICompliancyCheckerService;
}

const filterToggled = new ObservableValue<boolean>(false);
const allowFiltering = new ObservableValue<boolean>(true);

const filter = new Filter();
const pipelineSetupDropdownSelection = new DropdownMultiSelection();
const lastRunDropdownSelection = new DropdownMultiSelection();

interface IState {
  isLoading: boolean;
  isRescanning: boolean;
  buildPipelinesReport: IBuildPipelinesReport;
  hasReconcilePermission: boolean;
  selectedTabId: string;
}

export default class extends React.Component<IBuildPipelinesProps, IState> {
  constructor(props: IBuildPipelinesProps) {
    super(props);

    this.state = {
      buildPipelinesReport: {
        date: new Date(),
        hasReconcilePermissionUrl: "",
        rescanUrl: "",
        reports: []
      },
      isLoading: true,
      isRescanning: false,
      hasReconcilePermission: false,
      selectedTabId: "pipelines"
    };
  }

  private onSelectedTabChanged = (newTabId: string) => {
    this.setState({ selectedTabId: newTabId });
  };

  private onFilterBarDismissClicked = () => {
    filterToggled.value = !filterToggled.value;
  };

  private renderTabBarCommands = () => {
    return (
      <Observer allowFiltering={allowFiltering}>
        { allowFiltering.value ? 
            <HeaderCommandBarWithFilter
              filter={filter}
              filterToggled={filterToggled}
              items={[]}
            /> :
            <HeaderCommandBar items={[]}/>
        }
      </Observer>
    );
  };

  private async getData(): Promise<void> {
    const buildPipelinesReport = await this.props.azDoService.GetReportsFromDocumentStorage<IBuildPipelinesReport>("buildpipelines");
    const hasReconcilePermission = await this.props.compliancyCheckerService.HasReconcilePermission(buildPipelinesReport.hasReconcilePermissionUrl);

    this.setState({
      isLoading: false,
      buildPipelinesReport: buildPipelinesReport,
      hasReconcilePermission: hasReconcilePermission,
    });
  }

  async componentDidMount() {
    await this.getData();
  }

  render() {
    return (
      // @ts-ignore
      <Surface background={SurfaceBackground.neutral}>
        <Page className="flex-grow">
          <CompliancyHeader
            headerText="Build pipeline compliancy"
            lastScanDate={this.state.buildPipelinesReport.date}
            rescanUrl={this.state.buildPipelinesReport.rescanUrl}
            onRescanFinished={async () => { await this.getData() }}
            compliancyCheckerService={this.props.compliancyCheckerService}
          />

          {/* <TabBar
            selectedTabId={this.state.selectedTabId}
            onSelectedTabChanged={this.onSelectedTabChanged}
            renderAdditionalContent={this.renderTabBarCommands}
            disableSticky={false}
          >
            <Tab id="home" name="Home" />
            <Tab id="pipelines" name="Pipelines" />
            <Tab id="builds" name="Builds" />
          </TabBar> */}

          <ConditionalChildren renderChildren={filterToggled}>
            <div className="page-content-left page-content-right page-content-top">
              <FilterBar
                filter={filter}
                onDismissClicked={this.onFilterBarDismissClicked}
              >
                <KeywordFilterBarItem filterItemKey="keyword" />
                <DropdownFilterBarItem
                  filterItemKey="pipelineSetupStatus"
                  filter={filter}
                  items={getPossibleCompliancyStatuses().map(
                    getCompliancyStatusAsListItem
                  )}
                  selection={pipelineSetupDropdownSelection}
                  placeholder="Status"
                />
                <DropdownFilterBarItem
                  filterItemKey="lastRunStatus"
                  filter={filter}
                  items={getPossibleCompliancyStatuses().map(
                    getCompliancyStatusAsListItem
                  )}
                  selection={lastRunDropdownSelection}
                  placeholder="Last Run Status"
                />
              </FilterBar>
            </div>
          </ConditionalChildren>

          <div className="page-content page-content-top flex-row">
            <div className="flex-grow">
              { this.state.isLoading ? 
                <div>Loading...</div> :  
                this.getTabContent()
              }
            </div>
            <div className="flex-grow">
              <Card className="card-info" titleProps={{ text: "More information" }}>
                <div>
                  <p>We would ❤ getting in touch on the pipeline setup, so join us on our <Link href="https://confluence.dev.rabobank.nl/display/MTTAS/Sprint+Review+Menu" target="_blank"> sprint review</Link> @UC-T15!</p>

                  <p>More information on the <Link href="https://confluence.dev.rabobank.nl/pages/viewpage.action?pageId=119243814#ApplyDevOpsSecurityBlueprintCI/CDprinciples-Repositories" target="_blank">how &amp; why</Link>{" "}
                  of the pipeline setup with Azure Pipelines or <Link href="https://confluence.dev.rabobank.nl/display/MTTAS/Secure+Pipelines" target="_blank">secure pipelines</Link> in general.</p>

                  <p>If you still have questions or need assistance on your pipelines, create a <Link href="http://tools.rabobank.nl/vsts/request" target="_blank">support request</Link>.</p>
                </div>
              </Card>
            </div>
          </div>
        </Page>
      </Surface>
    );
  }

  getTabContent(): React.ReactNode {
    const { selectedTabId } = this.state;

    switch (selectedTabId) {
      case "home":
        allowFiltering.value = true;
        return <BuildPipelinesList filter={filter} />;

      case "pipelines":
        // allowFiltering.value = false;
        // filterToggled.value = false;
        return (
          <PipelinesMasterDetail
            title="Pipelines"
            hasReconcilePermission={this.state.hasReconcilePermission}
            data={this.state.buildPipelinesReport.reports}
            compliancyCheckerService={this.props.compliancyCheckerService}
          />
        );

      case "builds":
        allowFiltering.value = false;
        filterToggled.value = false;
        return <div>Build data here</div>;

      default:
          return <div></div>;
    }
  }
}