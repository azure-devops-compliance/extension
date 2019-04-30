import * as React from "react";
import { Card } from "azure-devops-ui/Card";
import { IObservableValue, ObservableValue, ObservableArray } from "azure-devops-ui/Core/Observable";
import { Header, TitleSize } from "azure-devops-ui/Header";
import { IListItemDetails, List, ListItem, ListSelection } from "azure-devops-ui/List";
import { DetailsPanel, MasterPanel, MasterPanelHeader } from "azure-devops-ui/MasterDetails";
import {
    BaseMasterDetailsContext,
    bindSelectionToObservable,
    IMasterDetailsContext,
    IMasterDetailsContextLayer,
    MasterDetailsContext
} from "azure-devops-ui/MasterDetailsContext";
import { Page } from "azure-devops-ui/Page";
import {
    ITableColumn,
    Table} from "azure-devops-ui/Table";
import { TextField } from "azure-devops-ui/TextField";
import { renderString, renderCheckmark } from "./TableRenderers";
import { IStatusProps, Statuses, Status, StatusSize } from "azure-devops-ui/Status";
import { sortingBehavior } from "./TableBehaviors";
import { Checkbox } from "azure-devops-ui/Checkbox";

interface IReportMaster {
    item: string,
    rules: IReportRule[]
}

interface IReportRule {
    description: string,
    status: IStatusProps
}

export default class extends React.Component<{ data: { item: string, rules:{ description: string, status: boolean }[] }[] }, {}> {
    private data: Array<IReportMaster> = this.props.data.map(m => {
        let master: IReportMaster = {
            item: m.item,
            rules: m.rules.map(r => {
                let rule: IReportRule = {
                    description: r.description,
                    status: r.status ? Statuses.Success : Statuses.Failed
                }
                return rule;
            })
        };
        return master;
    });
    private filteredDataProvider: ObservableArray<IReportMaster> = new ObservableArray<IReportMaster>();
    private searchValue = new ObservableValue<string>("");
    private showCompliantRepos = new ObservableValue<boolean>(true);
    private showNonCompliantRepos = new ObservableValue<boolean>(true);

    constructor(props: any) {
        super(props);

        this.filteredDataProvider.value = this.data;

        this.searchValue.subscribe((value, action) => { 
            this.filterRepositoriesList(value, this.showCompliantRepos.value, this.showNonCompliantRepos.value);
        });

        this.showCompliantRepos.subscribe((value, action) => {
            this.filterRepositoriesList(this.searchValue.value, value, this.showNonCompliantRepos.value);
        });

        this.showNonCompliantRepos.subscribe((value, action) => {
            this.filterRepositoriesList(this.searchValue.value, this.showCompliantRepos.value, value);
        });
    }

    private filterRepositoriesList(searchFilter: string, showCompliantRepos: boolean, showNonCompliantRepos: boolean) {
        this.filteredDataProvider.value = this.data.filter((value, index, array) => { 
            return value.item.includes(searchFilter) 
                && ((showCompliantRepos && this.isCompliant(value)) || (showNonCompliantRepos && !this.isCompliant(value)));
        });
    }

    private initialPayload: IMasterDetailsContextLayer<IReportMaster, undefined> = {
        key: "initial",
        masterPanelContent: {
            renderContent: (parentItem, initialSelectedMasterItem) => (
                <this.InitialMasterPanelContent  initialSelectedMasterItem={initialSelectedMasterItem} />
            ),
            renderHeader: () => <MasterPanelHeader title={"Repositories"} />,
            renderSearch: () => (
                <div>
                    <TextField 
                        prefixIconProps={{ iconName: "Search" }}
                        placeholder="Search..."
                        onChange={(e, newValue) => (this.searchValue.value = newValue)}
                        value={this.searchValue}
                        />
                    <div
                        className="flex-row flex-center flex-grow scroll-hidden"
                        style={{ marginTop: "5px" }} >
                        <Checkbox
                            onChange={(event, checked) => (this.showCompliantRepos.value = checked)}
                            checked={this.showCompliantRepos}
                            label="Compliant"
                        />
                        <div style={{ marginRight: "10px" }}></div>
                        <Checkbox
                            onChange={(event, checked) => (this.showNonCompliantRepos.value = checked)}
                            checked={this.showNonCompliantRepos}
                            label="Non-compliant"
                        />
                        <div className="flex-grow" />
                    </div>
                </div>
            ),
            hideBackButton: false //somehow this HIDES the back button
        },
        detailsContent: {
            renderContent: item => <this.InitialDetailView detailItem={item} />
        },
        selectedMasterItem: new ObservableValue<IReportMaster>(this.data[0]),
        parentItem: undefined
    };

    private InitialMasterPanelContent: React.FunctionComponent<{
        initialSelectedMasterItem: IObservableValue<IReportMaster>;
    }> = props => {
        const [initialSelection] = React.useState(new ListSelection());
    
        React.useEffect(() => {
            bindSelectionToObservable(
                initialSelection,
                this.filteredDataProvider,
                props.initialSelectedMasterItem
            );
        });
    
        return (
            <List
                itemProvider={this.filteredDataProvider}
                selection={initialSelection}
                renderRow={this.renderInitialRow}
                width="100%"
            />
        );
    };

    private isCompliant(item: IReportMaster): boolean {
        return !item.rules.some((rule) => { return rule.status != Statuses.Success });
    }

    private renderSmallCompliantIcon(item: IReportMaster) : JSX.Element {
        return  this.isCompliant(item) ?
            <div><Status {...Statuses.Success} className="icon-large-margin" size={StatusSize.s}/>Compliant</div> :
            <div><Status {...Statuses.Failed} className="icon-large-margin" size={StatusSize.s}/>Non-compliant</div>
    }

    private renderInitialRow = (
        index: number,
        item: IReportMaster,
        details: IListItemDetails<IReportMaster>,
        key?: string
    ): JSX.Element => {
        return (
            <ListItem
                className="master-example-row"
                key={key || "list-item" + index}
                index={index}
                details={details}
            >
                <div className="flex-row flex-center h-scroll-hidden" style={{ padding: "10px 0px" }}>
                    <div className="flex-noshrink" style={{ width: "32px" }} />
                    <div className="flex-column flex-shrink" style={{ minWidth: 0 }}>
                        <div className="primary-text text-ellipsis">{item.item}</div>
                        <div className="secondary-text">{this.renderSmallCompliantIcon(item)}</div>
                    </div>
                </div>
            </ListItem>
        );
    };

    private InitialDetailView: React.FunctionComponent<{
        detailItem: IReportMaster;
    }> = props => {
        const { detailItem } = props;
    
        const columns: ITableColumn<IReportRule>[] = [
            {
                id: "description",
                name: "Description",
                width: new ObservableValue(450),
                renderCell: renderString,
                sortProps: {
                    ariaLabelAscending: "Sorted A to Z",
                    ariaLabelDescending: "Sorted Z to A"
                }
            },
            { 
                id: "status", 
                name: "Status", 
                width: new ObservableValue(75), 
                renderCell: renderCheckmark,
                sortProps: {
                    ariaLabelAscending: "Sorted A to Z",
                    ariaLabelDescending: "Sorted Z to A"
                }
            }
        ];
    
        let itemProvider = new ObservableArray<IReportRule>(detailItem.rules);

        return (
            <Page>
                <Header
                    title={detailItem.item}
                    titleSize={TitleSize.Large}
                />
                <div className="page-content page-content-top">
                    <Card
                        className="bolt-card-no-vertical-padding"
                        contentProps={{ contentPadding: false }}
                    >
                        <Table<IReportRule>
                            columns={columns}
                            itemProvider={itemProvider}
                            showLines={true}
                            behaviors={[ sortingBehavior(itemProvider, columns) ]}
                        />
                    </Card>
                </div>
            </Page>
        );
    };

    private masterDetailsContext: IMasterDetailsContext = new BaseMasterDetailsContext(
        this.initialPayload,
        () => {
        }
    );

    render() {
        return (
            <MasterDetailsContext.Provider value={this.masterDetailsContext}>
                <div className="flex-row" style={{ width: "100%" }}>
                    <MasterPanel />
                    <DetailsPanel />
                </div>
            </MasterDetailsContext.Provider>
        );
    }
}
