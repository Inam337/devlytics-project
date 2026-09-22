import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Permission } from '../common/constants/permissions';
import {
  CurrentUser,
  OrganizationId,
  RequirePermissions,
  ResponseMessage,
} from '../common/decorators';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import type { AuthenticatedUser } from '../common/types/request-context';
import { CreateReportExportDto } from './dto/create-report-export.dto';
import { ReportQueryDto } from './dto/report-query.dto';
import { ReportResult, ReportsService } from './reports.service';

const uuid = () => new ParseUUIDPipe({ version: '4' });

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('developers')
  @RequirePermissions(Permission.REPORT_READ)
  @ApiOperation({
    summary: 'Developer Performance report (json, csv or pdf via ?format=)',
  })
  developers(
    @OrganizationId() organizationId: string,
    @Query() query: ReportQueryDto,
    @Res() res: Response,
  ) {
    return this.respond(
      res,
      this.reportsService.developers(organizationId, query),
    );
  }

  @Get('teams')
  @RequirePermissions(Permission.REPORT_READ)
  @ApiOperation({ summary: 'Team Performance report' })
  teams(
    @OrganizationId() organizationId: string,
    @Query() query: ReportQueryDto,
    @Res() res: Response,
  ) {
    return this.respond(res, this.reportsService.teams(organizationId, query));
  }

  @Get('repositories')
  @RequirePermissions(Permission.REPORT_READ)
  @ApiOperation({ summary: 'Repository Performance report' })
  repositories(
    @OrganizationId() organizationId: string,
    @Query() query: ReportQueryDto,
    @Res() res: Response,
  ) {
    return this.respond(
      res,
      this.reportsService.repositories(organizationId, query),
    );
  }

  @Get('quality')
  @RequirePermissions(Permission.REPORT_READ)
  @ApiOperation({ summary: 'Code Quality report' })
  quality(
    @OrganizationId() organizationId: string,
    @Query() query: ReportQueryDto,
    @Res() res: Response,
  ) {
    return this.respond(
      res,
      this.reportsService.quality(organizationId, query),
    );
  }

  @Get('rankings')
  @RequirePermissions(Permission.REPORT_READ)
  @ApiOperation({ summary: 'Rankings report' })
  rankings(
    @OrganizationId() organizationId: string,
    @Query() query: ReportQueryDto,
    @Res() res: Response,
  ) {
    return this.respond(
      res,
      this.reportsService.rankings(organizationId, query),
    );
  }

  @Get('improvements')
  @RequirePermissions(Permission.REPORT_READ)
  @ApiOperation({ summary: 'Improvements report' })
  improvements(
    @OrganizationId() organizationId: string,
    @Query() query: ReportQueryDto,
    @Res() res: Response,
  ) {
    return this.respond(
      res,
      this.reportsService.improvements(organizationId, query),
    );
  }

  @Post('exports')
  @RequirePermissions(Permission.REPORT_READ)
  @ResponseMessage('Report export queued successfully')
  @ApiOperation({
    summary:
      'Queue an async report export (PDF/CSV); poll GET /reports/exports/:id',
  })
  requestExport(
    @OrganizationId() organizationId: string,
    @Body() dto: CreateReportExportDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.requestExport(organizationId, dto, user);
  }

  @Get('exports')
  @RequirePermissions(Permission.REPORT_READ)
  @ApiOperation({ summary: 'List report exports I requested' })
  listExports(
    @OrganizationId() organizationId: string,
    @CurrentUser('userId') userId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.reportsService.listExports(organizationId, userId, query);
  }

  @Get('exports/:id')
  @RequirePermissions(Permission.REPORT_READ)
  @ApiOperation({ summary: 'Report export status' })
  exportStatus(
    @OrganizationId() organizationId: string,
    @Param('id', uuid()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.getExportStatus(organizationId, id, user);
  }

  @Get('exports/:id/download')
  @RequirePermissions(Permission.REPORT_READ)
  @ApiOperation({ summary: 'Download a completed report export' })
  async downloadExport(
    @OrganizationId() organizationId: string,
    @Param('id', uuid()) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const { fileName, mimeType, buffer } =
      await this.reportsService.downloadExport(organizationId, id, user);
    res
      .status(200)
      .header('Content-Type', mimeType)
      .header('Content-Disposition', `attachment; filename="${fileName}"`)
      .send(buffer);
  }

  private async respond(
    res: Response,
    resultPromise: Promise<ReportResult>,
  ): Promise<void> {
    const result = await resultPromise;

    if (result.format === 'csv' && result.buffer) {
      res
        .status(200)
        .header('Content-Type', 'text/csv; charset=utf-8')
        .header(
          'Content-Disposition',
          `attachment; filename="${slug(result.title)}.csv"`,
        )
        .send(result.buffer);
      return;
    }

    if (result.format === 'pdf' && result.buffer) {
      res
        .status(200)
        .header('Content-Type', 'application/pdf')
        .header(
          'Content-Disposition',
          `attachment; filename="${slug(result.title)}.pdf"`,
        )
        .send(result.buffer);
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        title: result.title,
        scope: result.scope,
        columns: result.columns,
        rows: result.rows,
      },
      message: 'Request completed successfully',
    });
  }
}

function slug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
